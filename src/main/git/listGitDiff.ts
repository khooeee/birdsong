import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { GitDiffFile, GitDiffRepository, GitDiffScope, GitDiffSnapshot } from "../../shared/gitDiff";
import type { WorkingFolder } from "../../shared/workingFolder";
import { errorMessage } from "../../shared/errorMessage";
import { gitDiffArgs } from "./gitDiffArgs";
import { runGit } from "./runGit";

const MAX_TEXT = 2 * 1024 * 1024;

function fileEntry(file: string, status: string, oldPath?: string): GitDiffFile {
  return { path: file, oldPath, status, additions: 0, deletions: 0, binary: false,
    untracked: false, revision: "" };
}

async function repositoryDiff(root: string, scope: GitDiffScope): Promise<GitDiffRepository> {
  const head = await runGit(root, ["rev-parse", "--verify", "HEAD"]).catch(() => "");
  const args = gitDiffArgs(scope, !!head);
  const [names, counts, others, indexed, branch] = await Promise.all([
    runGit(root, [...args, "--name-status", "-z"]),
    runGit(root, [...args, "--numstat", "-z"]),
    scope === "staged" ? "" : runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
    runGit(root, ["ls-files", "--stage", "-z"]),
    runGit(root, ["symbolic-ref", "--short", "HEAD"]).catch(() => head.trim().slice(0, 7)),
  ]);
  const files = new Map<string, GitDiffFile>();
  const tokens = names.split("\0");
  for (let i = 0; i < tokens.length && tokens[i];) {
    const status = tokens[i++][0];
    const from = tokens[i++];
    const to = status === "R" || status === "C" ? tokens[i++] : from;
    if (files.get(to)?.status !== "U") files.set(to, fileEntry(to, status, to !== from ? from : undefined));
  }
  const stats = counts.split("\0");
  for (let i = 0; i < stats.length && stats[i]; i++) {
    const match = /^(\d+|-)\t(\d+|-)\t(.*)$/s.exec(stats[i]);
    if (!match) continue;
    let name = match[3];
    if (!name) { i++; name = stats[++i]; }
    const file = files.get(name);
    if (file) {
      file.binary = match[1] === "-";
      file.additions = Number(match[1]) || 0;
      file.deletions = Number(match[2]) || 0;
    }
  }
  const index = new Map<string, string>();
  for (const token of indexed.split("\0")) {
    const match = /^(\d+) ([a-f0-9]+) (\d)\t(.*)$/s.exec(token);
    if (match) index.set(match[4], `${index.get(match[4]) ?? ""}${match[1]}:${match[2]}:${match[3]}`);
  }
  // With no HEAD, All compares the working tree with an empty tree, including staged new files.
  if (!head && scope === "all") {
    files.clear();
    for (const file of index.keys()) files.set(file, fileEntry(file, "A"));
  }
  for (const name of others.split("\0").filter(Boolean)) {
    files.set(name, { ...fileEntry(name, "A"), untracked: true });
  }
  for (const file of files.values()) {
    const stat = await fs.lstat(path.join(root, file.path)).catch(() => null);
    if (!head && scope === "all" && !stat) { files.delete(file.path); continue; }
    file.revision = `${head.trim()}:${index.get(file.path) ?? ""}:${scope === "staged" ? "" : `${stat?.mtimeMs}:${stat?.size}:${stat?.mode}`}:${file.status}`;
    if ((file.untracked || (!head && scope === "all")) && stat) {
      if (stat.size > MAX_TEXT || (!stat.isFile() && !stat.isSymbolicLink())) {
        continue;
      }
      const bytes = stat.isSymbolicLink()
        ? await fs.readlink(path.join(root, file.path)).then((target) => Buffer.from(target)).catch(() => null)
        : await fs.readFile(path.join(root, file.path)).catch(() => null);
      if (!bytes) continue; // A file can disappear while its repository is being refreshed.
      file.binary = bytes.subarray(0, 8000).includes(0);
      if (!file.binary) file.additions = bytes.length ? bytes.toString("utf8").split("\n").length - (bytes.at(-1) === 10 ? 1 : 0) : 0;
    }
  }
  return { root, branch: branch.trim(), files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
}

/** Resolve each registered folder to its own worktree; nested roots appear only once. */
export async function listGitDiff(folders: readonly WorkingFolder[], scope: GitDiffScope): Promise<GitDiffSnapshot> {
  gitDiffArgs(scope, true);
  const roots = new Set<string>();
  const errors: string[] = [];
  for (const folder of folders) {
    try { roots.add((await runGit(folder.path, ["rev-parse", "--show-toplevel"])).replace(/\r?\n$/, "")); }
    catch { errors.push(`No Git repository found in ${folder.path}.`); }
  }
  const repositories: GitDiffRepository[] = [];
  for (const root of roots) {
    try { repositories.push(await repositoryDiff(root, scope)); }
    catch (error) { errors.push(`${root}: ${errorMessage(error)}`); }
  }
  return { repositories, errors };
}
