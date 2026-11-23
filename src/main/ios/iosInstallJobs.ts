import { spawn, execFile, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { liveControlEndpoint } from "../control/liveControlEndpoint";
import { tailscaleServeFor } from "../remote/tailscaleServeFor";
import { buildInstallManifest } from "./installManifest";

const execFileAsync = promisify(execFile);
const LOG_LIMIT = 200_000;
const LOG_TAIL = 4000;

type JobState = "running" | "done" | "failed" | "stopped";

interface BuildSpec {
  command: string;
  args: string[];
  label: string;
}

interface Job {
  id: string;
  projectRoot: string;
  label: string;
  state: JobState;
  log: string;
  proc: ChildProcess | null;
  ipaPath: string | null;
  token: string | null;
  manifest: string | null;
  manifestUrl: string | null;
  installUrl: string | null;
  serveNote: string | null;
}

const jobs = new Map<string, Job>();
let counter = 0;

function appendLog(job: Job, chunk: string): void {
  job.log = `${job.log}${chunk}`.slice(-LOG_LIMIT);
}

async function isDir(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function resolveRoot(projectRoot: string | undefined, cwd: string, folders: string[]): Promise<string> {
  if (projectRoot && (await isDir(projectRoot))) return resolve(projectRoot);
  for (const folder of folders) {
    if (folder && (await isDir(folder))) return folder;
  }
  if (cwd && (await isDir(cwd))) return cwd;
  throw new Error("No project folder found. Pass projectRoot or open a working folder first.");
}

async function discoverBuild(root: string, buildHint: string | undefined): Promise<BuildSpec> {
  if (buildHint?.trim()) {
    const hint = buildHint.trim();
    if (hint.startsWith("make ")) {
      return { command: "make", args: hint.slice(5).split(/\s+/).filter(Boolean), label: hint };
    }
    const script = resolve(root, hint);
    try {
      await stat(script);
      return { command: "bash", args: [script], label: `bash ${hint}` };
    } catch {
      throw new Error(`Build hint not found: ${hint}`);
    }
  }
  try {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    if (pkg.scripts?.["ios:ipa"]) return { command: "npm", args: ["run", "ios:ipa", "--silent"], label: "npm run ios:ipa" };
    const ipaScript = Object.keys(pkg.scripts ?? {}).find((name) => /ipa/i.test(name));
    if (ipaScript) return { command: "npm", args: ["run", ipaScript, "--silent"], label: `npm run ${ipaScript}` };
  } catch {
    /* no package.json; fall through */
  }
  for (const name of ["Makefile", "makefile", "GNUmakefile"]) {
    try {
      const text = await readFile(join(root, name), "utf8");
      if (/^ipa\s*:/m.test(text)) return { command: "make", args: ["ipa"], label: "make ipa" };
    } catch {
      /* missing */
    }
  }
  for (const name of ["scripts/build-ios-ipa.sh", "scripts/build-ipa.sh"]) {
    try {
      await stat(join(root, name));
      return { command: "bash", args: [join(root, name)], label: `bash ${name}` };
    } catch {
      /* missing */
    }
  }
  try {
    const entries = await readdir(join(root, "scripts"));
    const match = entries.filter((entry) => /ipa/i.test(entry)).sort()[0];
    if (match) return { command: "bash", args: [join(root, "scripts", match)], label: `bash scripts/${match}` };
  } catch {
    /* no scripts dir */
  }
  throw new Error("No IPA build script found. Pass buildHint, or add scripts/build-ios-ipa.sh or a `make ipa` target.");
}

interface IpaHit {
  path: string;
  mtime: number;
}

async function walkIpas(dir: string, depth: number, hits: IpaHit[]): Promise<void> {
  if (depth < 0) return;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".git" || entry === "DerivedData") continue;
    const full = join(dir, entry);
    let info: Awaited<ReturnType<typeof stat>> | null = null;
    try {
      info = await stat(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) await walkIpas(full, depth - 1, hits);
    else if (entry.endsWith(".ipa")) hits.push({ path: full, mtime: info.mtimeMs });
  }
}

async function readIpaMetadata(ipaPath: string): Promise<{ bundleId: string; version: string; title: string }> {
  const script = [
    "import zipfile,plistlib,json,sys",
    "z=zipfile.ZipFile(sys.argv[1])",
    "names=[n for n in z.namelist() if n.startswith('Payload/') and n.count('/')==2 and n.endswith('.app/Info.plist')]",
    "info=plistlib.loads(z.read(names[0]))",
    "print(json.dumps({'bundleId':info.get('CFBundleIdentifier',''),'version':info.get('CFBundleShortVersionString','1.0'),'title':info.get('CFBundleDisplayName') or info.get('CFBundleName') or 'App'}))",
  ].join(";");
  const { stdout } = await execFileAsync("python3", ["-c", script, ipaPath], { timeout: 30_000 });
  const meta = JSON.parse(stdout) as { bundleId: string; version: string; title: string };
  if (!meta.bundleId) throw new Error("Could not read bundle id from the IPA.");
  return meta;
}

function publicView(job: Job): Record<string, unknown> {
  const view: Record<string, unknown> = {
    jobId: job.id,
    state: job.state,
    label: job.label,
    projectRoot: job.projectRoot,
    logTail: job.log.slice(-LOG_TAIL),
  };
  if (job.ipaPath) view.ipaPath = job.ipaPath;
  if (job.manifestUrl) view.manifestUrl = job.manifestUrl;
  if (job.installUrl) view.installUrl = job.installUrl;
  if (job.serveNote) view.serveNote = job.serveNote;
  return view;
}

async function finish(job: Job): Promise<void> {
  const hits: IpaHit[] = [];
  await walkIpas(job.projectRoot, 4, hits);
  hits.sort((a, b) => b.mtime - a.mtime);
  const ipaPath = hits[0]?.path ?? null;
  if (!ipaPath) {
    job.state = "failed";
    appendLog(job, "\nBuild finished but no .ipa was found.\n");
    return;
  }
  let meta: { bundleId: string; version: string; title: string };
  try {
    meta = await readIpaMetadata(ipaPath);
  } catch (error) {
    job.state = "failed";
    appendLog(job, `\nCould not read IPA metadata: ${error instanceof Error ? error.message : String(error)}\n`);
    return;
  }
  const endpoint = await liveControlEndpoint.get();
  const serve = endpoint ? await tailscaleServeFor(endpoint.port).catch(() => null) : null;
  job.ipaPath = ipaPath;
  if (!serve) {
    job.state = "done";
    job.serveNote = endpoint
      ? `Run \`tailscale serve --bg ${endpoint.port}\` to serve the install link.`
      : "Control server is not running; restart Birdsong to serve the install link.";
    appendLog(job, `\nIPA ready (not served yet): ${ipaPath}\n`);
    return;
  }
  const token = randomUUID().replace(/-/g, "");
  const ipaName = basename(ipaPath);
  const manifestUrl = `${serve.url}/ios/${token}/manifest.plist`;
  const ipaUrl = `${serve.url}/ios/${token}/${encodeURIComponent(ipaName)}`;
  job.token = token;
  job.manifest = buildInstallManifest({ ipaUrl, bundleId: meta.bundleId, version: meta.version, title: meta.title });
  job.manifestUrl = manifestUrl;
  job.installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
  job.state = "done";
  appendLog(job, `\nIPA: ${ipaPath}\nInstall: ${job.installUrl}\n`);
}

async function start(input: {
  projectRoot?: string;
  buildHint?: string;
  cwd: string;
  folders: string[];
}): Promise<Record<string, unknown>> {
  if (process.platform !== "darwin") throw new Error("iOS builds require macOS with Xcode.");
  const root = await resolveRoot(input.projectRoot, input.cwd, input.folders);
  const spec = await discoverBuild(root, input.buildHint);
  counter += 1;
  const job: Job = {
    id: `ios-${Date.now().toString(36)}-${counter}`,
    projectRoot: root,
    label: spec.label,
    state: "running",
    log: `$ ${spec.label}\n`,
    proc: null,
    ipaPath: null,
    token: null,
    manifest: null,
    manifestUrl: null,
    installUrl: null,
    serveNote: null,
  };
  jobs.set(job.id, job);
  const proc = spawn(spec.command, spec.args, { cwd: root, env: { ...process.env } });
  job.proc = proc;
  proc.stdout?.on("data", (chunk: Buffer) => appendLog(job, chunk.toString()));
  proc.stderr?.on("data", (chunk: Buffer) => appendLog(job, chunk.toString()));
  proc.on("error", (error) => {
    job.proc = null;
    job.state = "failed";
    appendLog(job, `\nCould not start build: ${error.message}\n`);
  });
  proc.on("close", (code) => {
    job.proc = null;
    if (job.state !== "running") return;
    if (code !== 0) {
      job.state = "failed";
      appendLog(job, `\nBuild exited with code ${code}.\n`);
      return;
    }
    void finish(job).catch((error: unknown) => {
      job.state = "failed";
      appendLog(job, `\nFinishing failed: ${error instanceof Error ? error.message : String(error)}\n`);
    });
  });
  return publicView(job);
}

function status(jobId: string): Record<string, unknown> {
  const job = jobs.get(jobId);
  if (!job) throw new Error("Install job not found.");
  return publicView(job);
}

function stop(jobId: string | undefined): Record<string, unknown> {
  const job = jobId ? jobs.get(jobId) : [...jobs.values()].pop();
  if (!job) throw new Error("No install job to stop.");
  try {
    job.proc?.kill();
  } catch {
    /* already exited */
  }
  job.proc = null;
  job.state = "stopped";
  job.token = null;
  job.manifestUrl = null;
  job.installUrl = null;
  return { stopped: job.id };
}

function getDeploy(token: string): { manifest: string; ipaPath: string; ipaName: string } | null {
  for (const job of jobs.values()) {
    if (job.state === "done" && job.token === token && job.manifest && job.ipaPath) {
      return { manifest: job.manifest, ipaPath: job.ipaPath, ipaName: basename(job.ipaPath) };
    }
  }
  return null;
}

/** Background IPA builds and their OTA install links; links die with the process. */
export const iosInstallJobs = { start, status, stop, getDeploy };
