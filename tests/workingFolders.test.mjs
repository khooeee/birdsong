import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { SessionWorkingFolders } = await jiti.import("../src/main/workingFolders/SessionWorkingFolders.ts");
const { loadWorkingFolders } = await jiti.import("../src/main/workingFolders/loadWorkingFolders.ts");
const { callBirdsongTool } = await jiti.import("../src/main/mcp/callBirdsongTool.ts");
const run = promisify(execFile);

async function fixture(t) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-roots-"));
  const cwd = await fs.realpath(temporary);
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  const session = { id: "test", cwd, workingFolders: await loadWorkingFolders(undefined, cwd) };
  const saves = [];
  const emissions = [];
  const host = {
    getSession: (id) => id === session.id ? session : undefined,
    ensure: async (id) => id === session.id ? session : null,
    save: async (value) => { saves.push(structuredClone(value.workingFolders)); },
    emit: () => emissions.push(structuredClone(session.workingFolders)),
  };
  return { cwd, session, saves, emissions, host, folders: new SessionWorkingFolders(host) };
}

test("upgrades old sessions, preserves empty lists and missing saved roots", async (t) => {
  const { cwd, session } = await fixture(t);
  assert.deepEqual(session.workingFolders, [{ id: "session", path: cwd }]);
  assert.deepEqual(await loadWorkingFolders([], cwd), []);
  const missing = [{ id: "gone", path: path.join(cwd, "deleted-worktree") }];
  assert.deepEqual(await loadWorkingFolders(missing, cwd), missing);
  assert.deepEqual(await loadWorkingFolders([{ id: "bad", path: "relative" }, ...missing, ...missing], cwd), missing);
});

test("dedupes relative paths, dot segments and symlinks without moving the entry", async (t) => {
  const { cwd, folders, saves, emissions } = await fixture(t);
  await fs.mkdir(path.join(cwd, "worktree"));
  await fs.symlink(path.join(cwd, "worktree"), path.join(cwd, "alias"), "dir");
  const first = await folders.add("test", "worktree");
  const entry = first[1];
  assert.equal(await folders.add("test", "./worktree/../alias"), first);
  assert.equal(await folders.add("test", entry.path), first);
  assert.equal(folders.list("test")[1], entry);
  assert.equal(saves.length, 1);
  assert.deepEqual(emissions, saves);
});

test("a registered symlink stays pinned when its target changes", async (t) => {
  const { cwd, folders } = await fixture(t);
  await fs.mkdir(path.join(cwd, "one"));
  await fs.mkdir(path.join(cwd, "two"));
  const alias = path.join(cwd, "alias");
  await fs.symlink(path.join(cwd, "one"), alias, "dir");
  const registered = (await folders.add("test", alias))[1];
  await fs.unlink(alias);
  await fs.symlink(path.join(cwd, "two"), alias, "dir");
  assert.equal(folders.list("test")[1].path, path.join(cwd, "one"));
  const next = await folders.add("test", alias);
  assert.equal(next.length, 3);
  assert.notEqual(next[2].id, registered.id);
});

test("rejects files, missing directories and empty paths without changing the list", async (t) => {
  const { cwd, session, folders, saves } = await fixture(t);
  await fs.writeFile(path.join(cwd, "file"), "text");
  const original = session.workingFolders;
  await assert.rejects(folders.add("test", "file"), /directory/);
  await assert.rejects(folders.add("test", "missing"), /ENOENT/);
  await assert.rejects(folders.add("test", " "), /required/);
  assert.equal(session.workingFolders, original);
  assert.equal(saves.length, 0);
});

test("concurrent additions preserve both roots and dedupe concurrent aliases", async (t) => {
  const { cwd, folders, session } = await fixture(t);
  await fs.mkdir(path.join(cwd, "one"));
  await fs.mkdir(path.join(cwd, "two"));
  const originalRoot = session.workingFolders[0];
  await Promise.all([folders.add("test", "one"), folders.add("test", "two"), folders.add("test", "./one")]);
  assert.deepEqual(folders.list("test").map((folder) => folder.path), [cwd, path.join(cwd, "one"), path.join(cwd, "two")]);
  assert.equal(session.workingFolders[0], originalRoot);
});

test("moves preserve identities and removal still works after the worktree disappears", async (t) => {
  const { cwd, folders, saves } = await fixture(t);
  await fs.mkdir(path.join(cwd, "one"));
  await fs.mkdir(path.join(cwd, "two"));
  await folders.add("test", "one");
  const [initial, one, two] = await folders.add("test", "two");
  assert.deepEqual(await folders.move("test", two.id, initial.id), [two, initial, one]);
  assert.equal(folders.list("test")[0], two);
  assert.deepEqual(await folders.move("test", two.id), [initial, one, two]);
  const before = saves.length;
  await folders.move("test", two.id);
  assert.equal(saves.length, before);
  await assert.rejects(folders.move("test", one.id, "missing"), /not found/);
  await fs.rm(one.path, { recursive: true });
  assert.deepEqual(await folders.remove("test", one.id), [initial, two]);
  await folders.remove("test", initial.id);
  assert.deepEqual(await folders.remove("test", two.id), []);
  assert.deepEqual(saves.at(-1), []);
});

test("failed persistence rolls back without notifying the UI", async (t) => {
  const { cwd, session, folders, host, emissions } = await fixture(t);
  await fs.mkdir(path.join(cwd, "one"));
  const original = session.workingFolders;
  host.save = async () => { throw new Error("disk full"); };
  await assert.rejects(folders.add("test", "one"), /disk full/);
  assert.equal(session.workingFolders, original);
  assert.equal(emissions.length, 0);
});

test("distinct git worktrees sharing a repository stay separate", async (t) => {
  const { cwd, folders } = await fixture(t);
  await run("git", ["init", "--quiet", cwd]);
  await run("git", ["-C", cwd, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--quiet", "--allow-empty", "-m", "Initial"]);
  const worktree = path.join(cwd, "tree");
  await run("git", ["-C", cwd, "worktree", "add", "--quiet", "-b", "other", worktree]);
  const result = await folders.add("test", worktree);
  assert.deepEqual(result.map((folder) => folder.path), [cwd, worktree]);
});

test("MCP list, add and remove affect only the authenticated calling session", async (t) => {
  const { cwd, folders, session } = await fixture(t);
  await fs.mkdir(path.join(cwd, "worktree"));
  const sessions = { workingFolders: folders };
  const call = async (name, args = {}) => {
    const result = await callBirdsongTool(sessions, session.id, name, args, new AbortController().signal);
    assert.equal(result.isError, undefined, JSON.stringify(result));
    return JSON.parse(result.content[0].text);
  };
  const added = await call("add_working_folder", { path: "worktree", sessionId: "another-session" });
  assert.equal(added.length, 2);
  assert.deepEqual(await call("list_working_folders"), added);
  const removed = await call("remove_working_folder", { folderId: added[1].id });
  assert.equal(removed.length, 1);
  const invalid = await callBirdsongTool(sessions, session.id, "add_working_folder", {}, new AbortController().signal);
  assert.equal(invalid.isError, true);
});
