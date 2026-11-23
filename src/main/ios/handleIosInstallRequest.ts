import { createReadStream, promises as fs } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { iosInstallJobs } from "./iosInstallJobs";

function sendManifest(res: ServerResponse, manifest: string): void {
  const body = Buffer.from(manifest, "utf8");
  res.writeHead(200, {
    "Content-Type": "application/x-plist",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function sendIpa(res: ServerResponse, ipaPath: string, ipaName: string): Promise<void> {
  const info = await fs.stat(ipaPath);
  res.writeHead(200, {
    "Content-Type": "application/octet-stream",
    "Content-Length": info.size,
    "Content-Disposition": `attachment; filename="${ipaName.replace(/"/g, "")}"`,
    "Cache-Control": "no-store",
  });
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(ipaPath);
    stream.on("error", reject);
    res.on("error", reject);
    res.on("finish", () => resolve());
    stream.pipe(res);
  });
}

/** Serve one job's manifest and IPA under its unguessable token; the token is the auth. */
export async function handleIosInstallRequest(
  _req: IncomingMessage,
  res: ServerResponse,
  token: string,
  file: string,
): Promise<void> {
  const deploy = iosInstallJobs.getDeploy(token);
  if (!deploy) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Install link expired or already installed." }));
    return;
  }
  if (file === "manifest.plist") return sendManifest(res, deploy.manifest);
  if (file === deploy.ipaName) return sendIpa(res, deploy.ipaPath, deploy.ipaName);
  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Not found" }));
}
