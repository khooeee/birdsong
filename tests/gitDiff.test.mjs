import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { createJiti } from "jiti";

const run = promisify(execFile);
const jiti = createJiti(import.meta.url);
const { listGitDiff } = await jiti.import("../src/main/git/listGitDiff.ts");
const { readGitPatch } = await jiti.import("../src/main/git/readGitPatch.ts");
const { parseGitPatch } = await jiti.import("../src/main/git/parseGitPatch.ts");
const { sumGitDiffStats } = await jiti.import("../src/renderer/features/diff/sumGitDiffStats.ts");
const { shareGitDiff } = await jiti.import("../src/renderer/features/diff/shareGitDiff.ts");
const { wordDiffRanges } = await jiti.import("../src/renderer/features/diff/wordDiffRanges.ts");
const { diffHunkRows } = await jiti.import("../src/renderer/features/diff/diffHunkRows.ts");

async function fixture(t, commit = true) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-diff-"));
  const root = await fs.realpath(temporary);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = async (...args) => (await run("git", args, { cwd: root })).stdout;
  await git("init", "-b", "main");
  await git("config", "user.name", "Diff Test");
  await git("config", "user.email", "diff@example.invalid");
  const write = (name, text) => fs.writeFile(path.join(root, name), text);
  if (commit) {
    await write("a.ts", "export const value = 1;\n");
    await write("remove.txt", "delete this\n");
    await write("rename.txt", "unchanged content\n");
    await git("add", ".");
    await git("commit", "-qm", "Initial");
  }
  const folders = [{ id: "root", path: root }];
  const list = async (scope = "all") => {
    const result = await listGitDiff(folders, scope);
    assert.deepEqual(result.errors, []);
    return result.repositories[0];
  };
  const patch = (file, scope = "all", full = false) => readGitPatch(folders, root, file.path, file.oldPath, scope, full);
  return { root, folders, git, write, list, patch };
}

test("All, Staged and Unstaged use HEAD, index and working-tree content respectively", async (t) => {
  const f = await fixture(t);
  await f.write("a.ts", "export const value = 2;\n");
  await f.git("add", "a.ts");
  await f.write("a.ts", "export const value = 3;\n");
  for (const [scope, before, after] of [["all", 1, 3], ["staged", 1, 2], ["unstaged", 2, 3]]) {
    const repo = await f.list(scope);
    assert.equal(repo.branch, "main");
    assert.equal(repo.files.length, 1);
    assert.equal(repo.files[0].additions, 1);
    assert.equal(repo.files[0].deletions, 1);
    const result = await f.patch(repo.files[0], scope);
    assert.equal(result.hunks[0].lines.find((line) => line.kind === "removed").text, `export const value = ${before};`);
    assert.equal(result.hunks[0].lines.find((line) => line.kind === "added").text, `export const value = ${after};`);
  }
});

test("All hides changes which cancel out between the index and working tree", async (t) => {
  const f = await fixture(t);
  await f.write("a.ts", "staged\n");
  await f.git("add", "a.ts");
  await f.write("a.ts", "export const value = 1;\n");
  assert.equal((await f.list()).files.length, 0);
  assert.equal((await f.list("staged")).files.length, 1);
  assert.equal((await f.list("unstaged")).files.length, 1);
});

test("untracked text and binary files appear without ignored files or staging mutations", async (t) => {
  const f = await fixture(t);
  await f.write(".gitignore", "ignored.txt\n");
  await f.write("ignored.txt", "hidden\n");
  await f.write("new.txt", "one\ntwo\n");
  await f.write("empty.txt", "");
  await f.write("image.bin", Buffer.from([0, 1, 2]));
  const before = await f.git("status", "--porcelain=v1", "-z");
  const files = (await f.list()).files;
  assert.ok(!files.some((file) => file.path === "ignored.txt"));
  const added = files.find((file) => file.path === "new.txt");
  assert.equal(added.untracked, true);
  assert.equal(added.additions, 2);
  assert.equal((await f.patch(added)).hunks[0].lines.length, 2);
  assert.equal(files.find((file) => file.path === "image.bin").binary, true);
  assert.match((await f.patch(files.find((file) => file.path === "empty.txt"))).note, /Empty/);
  assert.equal((await f.list("staged")).files.length, 0);
  assert.equal(await f.git("status", "--porcelain=v1", "-z"), before);
});

test("NUL-delimited paths survive tabs, newlines, Unicode, and pathspec magic", async (t) => {
  const f = await fixture(t);
  const names = ["tab\tname.txt", "line\nbreak.txt", "日本語.txt", ":(glob)*.txt", "--option.txt"];
  for (const name of names) await f.write(name, "before\n");
  await f.git("add", ".");
  await f.git("commit", "-qm", "Unusual names");
  for (const name of names) await f.write(name, "after\n");
  for (const file of (await f.list()).files) {
    assert.ok(names.includes(file.path));
    assert.equal(file.additions, 1);
    const result = await f.patch(file);
    assert.equal(result.hunks[0].lines.find((line) => line.kind === "added").text, "after");
  }
  assert.equal((await f.list()).files.length, names.length);
});

test("renames, deleted files, and pure mode changes retain their Git status", async (t) => {
  const f = await fixture(t);
  await f.git("mv", "rename.txt", "renamed.txt");
  await fs.unlink(path.join(f.root, "remove.txt"));
  await fs.chmod(path.join(f.root, "a.ts"), 0o755);
  const files = (await f.list()).files;
  const renamed = files.find((file) => file.path === "renamed.txt");
  assert.equal(renamed.status, "R");
  assert.equal(renamed.oldPath, "rename.txt");
  assert.equal((await f.patch(renamed)).hunks.length, 0);
  const deleted = files.find((file) => file.status === "D");
  assert.equal(deleted.deletions, 1);
  assert.equal((await f.patch(deleted)).hunks[0].lines[0].kind, "removed");
  assert.match((await f.patch(files.find((file) => file.path === "a.ts"))).note, /mode changed/);
});

test("a new repository without commits compares staged and working content correctly", async (t) => {
  const f = await fixture(t, false);
  await f.write("new.txt", "index\n");
  await f.git("add", "new.txt");
  await f.write("new.txt", "disk\n");
  await f.write("untracked.txt", "new\n");
  for (const [scope, expected] of [["all", "disk"], ["staged", "index"], ["unstaged", "disk"]]) {
    const repo = await f.list(scope);
    const file = repo.files.find((entry) => entry.path === "new.txt");
    assert.equal((await f.patch(file, scope)).hunks[0].lines.find((line) => line.kind === "added").text, expected);
  }
  assert.equal((await f.list("all")).files.length, 2);
  await fs.unlink(path.join(f.root, "new.txt"));
  assert.equal((await f.list("all")).files.length, 1);
});

test("multiple roots deduplicate repositories while keeping linked worktrees separate", async (t) => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.root, "src"));
  const worktree = `${f.root}-worktree`;
  await f.git("worktree", "add", "-b", "feature", worktree);
  t.after(() => fs.rm(worktree, { recursive: true, force: true }));
  await f.write("a.ts", "main edit\n");
  await fs.writeFile(path.join(worktree, "a.ts"), "feature edit\n");
  const result = await listGitDiff([...f.folders, { id: "nested", path: path.join(f.root, "src") },
    { id: "worktree", path: worktree }], "all");
  assert.deepEqual(result.errors, []);
  assert.equal(result.repositories.length, 2);
  assert.deepEqual(result.repositories.map((repo) => repo.branch), ["main", "feature"]);
  for (const repo of result.repositories) assert.equal(repo.files.length, 1);
  assert.deepEqual(sumGitDiffStats(result), { additions: 2, deletions: 2 });

  // The session summary covers staged, unstaged and untracked content across every root.
  await f.git("add", "a.ts");
  await f.write("a.ts", "main edit\nextra line\n");
  await fs.unlink(path.join(worktree, "remove.txt"));
  await fs.writeFile(path.join(worktree, "new.txt"), "one\ntwo\n");
  const updated = await listGitDiff([...f.folders, { id: "nested", path: path.join(f.root, "src") },
    { id: "worktree", path: worktree }], "all");
  assert.deepEqual(updated.errors, []);
  assert.deepEqual(sumGitDiffStats(updated), { additions: 5, deletions: 3 });
});

test("missing repositories, invalid scopes, and escaping patch paths are handled explicitly", async (t) => {
  const f = await fixture(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-no-git-"));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  const result = await listGitDiff([...f.folders, { id: "outside", path: outside }], "all");
  assert.equal(result.repositories.length, 1);
  assert.match(result.errors[0], /No Git repository/);
  await assert.rejects(listGitDiff(f.folders, "wrong"), /Unknown diff scope/);
  await assert.rejects(readGitPatch(f.folders, outside, "a.ts", undefined, "all", false), /outside/);
  await assert.rejects(readGitPatch(f.folders, f.root, "../outside", undefined, "all", false), /Invalid diff path/);
});

test("context expansion, line numbers, and missing final newlines follow Git hunks", async (t) => {
  const f = await fixture(t);
  const lines = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`);
  await f.write("a.ts", lines.join("\n") + "\n");
  await f.git("add", "a.ts");
  await f.git("commit", "-qm", "Long file");
  lines[14] = "changed";
  await f.write("a.ts", lines.join("\n"));
  const file = (await f.list()).files[0];
  const limited = await f.patch(file);
  assert.equal(limited.hunks[0].lines[0].oldLine, 12);
  const full = await f.patch(file, "all", true);
  assert.equal(full.hunks[0].lines[0].oldLine, 1);
  assert.ok(full.hunks[0].lines.some((line) => line.kind === "note" && /No newline/.test(line.text)));
});

test("large and binary patches avoid rendering unbounded content", async (t) => {
  const f = await fixture(t);
  await f.write("huge.txt", "x".repeat(2 * 1024 * 1024 + 1));
  const huge = (await f.list()).files.find((file) => file.path === "huge.txt");
  assert.match((await f.patch(huge)).note, /too large/);
  assert.match(parseGitPatch("diff --git a/a b/a\nBinary files a/a and b/a differ\n").note, /Binary/);
});

test("review revisions change for index and file-mode edits", async (t) => {
  const f = await fixture(t);
  await f.write("a.ts", "changed\n");
  await f.git("add", "a.ts");
  const staged = (await f.list("staged")).files[0].revision;
  await f.git("update-index", "--chmod=+x", "a.ts");
  assert.notEqual((await f.list("staged")).files[0].revision, staged);
  const working = (await f.list()).files[0].revision;
  await fs.chmod(path.join(f.root, "a.ts"), 0o755);
  assert.notEqual((await f.list()).files[0].revision, working);
});

test("unmerged files are labeled as conflicts instead of reporting no content changes", async (t) => {
  const f = await fixture(t);
  await f.git("checkout", "-qb", "other");
  await f.write("a.ts", "other\n");
  await f.git("commit", "-am", "Other");
  await f.git("checkout", "main");
  await f.write("a.ts", "main\n");
  await f.git("commit", "-am", "Main");
  await f.git("merge", "other").catch(() => {});
  const file = (await f.list("unstaged")).files.find((entry) => entry.path === "a.ts");
  assert.equal(file.status, "U");
  assert.match((await f.patch(file, "unstaged")).note, /Unmerged/);
});

test("polling preserves unchanged repository and file identities", () => {
  const previous = { repositories: [{ root: "/repo", branch: "main", files: [
    { path: "a.ts", revision: "one" }, { path: "b.ts", revision: "two" },
  ] }], errors: [] };
  assert.equal(shareGitDiff(previous, structuredClone(previous)), previous);
  const next = structuredClone(previous);
  next.repositories[0].files[1].revision = "changed";
  const shared = shareGitDiff(previous, next);
  assert.equal(shared.repositories[0].files[0], previous.repositories[0].files[0]);
  assert.notEqual(shared.repositories[0].files[1], previous.repositories[0].files[1]);
});

test("split rows align replacements and highlight only changed words", () => {
  const lines = [
    { kind: "removed", text: "const count = 1;", oldLine: 4 },
    { kind: "added", text: "const count = 2;", newLine: 4 },
    { kind: "added", text: "extra();", newLine: 5 },
  ];
  const split = diffHunkRows(lines, true);
  assert.equal(split.length, 2);
  assert.equal(split[0].left, lines[0]);
  assert.equal(split[0].right, lines[1]);
  assert.deepEqual(split[0].leftChanged, [[14, 15]]);
  assert.equal(split[1].left, undefined);
  const unified = diffHunkRows(lines, false);
  assert.deepEqual(unified.map((row) => row.left), lines);
  assert.deepEqual(wordDiffRanges("same", "same"), { before: [], after: [] });
});
