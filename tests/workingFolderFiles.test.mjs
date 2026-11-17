import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { migrateExplorerPaths } = await jiti.import("../src/main/files/migrateExplorerPaths.ts");
const { workingFolderRoot } = await jiti.import("../src/main/files/workingFolderRoot.ts");
const { readSessionFile } = await jiti.import("../src/main/files/readSessionFile.ts");
const { writeSessionFile } = await jiti.import("../src/main/files/writeSessionFile.ts");
const { renameSessionFile } = await jiti.import("../src/main/files/renameSessionFile.ts");
const { SessionFileWatcher } = await jiti.import("../src/main/files/SessionFileWatcher.ts");
const { visibleTreeRows } = await jiti.import("../src/renderer/features/explorer/visibleTreeRows.ts");
const { explorerStore } = await jiti.import("../src/renderer/features/explorer/explorerStore.ts");
const { pathEntries } = await jiti.import("../src/renderer/features/goToFile/pathEntries.ts");
const { SessionWorkingFolders } = await jiti.import("../src/main/workingFolders/SessionWorkingFolders.ts");
const { callBirdsongTool } = await jiti.import("../src/main/mcp/callBirdsongTool.ts");
const { fileBufferStore } = await jiti.import("../src/renderer/features/editor/fileBufferStore.ts");
const { refreshSessionFiles } = await jiti.import("../src/renderer/features/explorer/refreshSessionFiles.ts");
const { shareSession } = await jiti.import("../src/renderer/features/sessions/shareSession.ts");

async function fixture(t) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-files-"));
  const cwd = await fs.realpath(temporary);
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  const roots = ["one", "two"].map((name) => ({ id: name, path: path.join(cwd, name) }));
  await Promise.all(roots.map((root) => fs.mkdir(root.path)));
  return { cwd, roots, session: { id: "files", cwd, workingFolders: roots } };
}

test("saved relative paths, selection and scroll offsets migrate without changing absolute tabs", async (t) => {
  const { cwd } = await fixture(t);
  const saved = {
    expanded: ["src"], selected: "src/a.ts", openFiles: ["src/a.ts", "/external/b.ts"],
    activeFile: "src/a.ts", previewFile: "/external/b.ts", treeScrollTop: 120,
    fileTops: { "src/a.ts": 50, "/external/b.ts": 90 },
  };
  const migrated = await migrateExplorerPaths(saved, cwd);
  assert.deepEqual(migrated.expanded, [path.join(cwd, "src")]);
  assert.equal(migrated.selected, path.join(cwd, "src/a.ts"));
  assert.deepEqual(migrated.openFiles, [path.join(cwd, "src/a.ts"), "/external/b.ts"]);
  assert.equal(migrated.fileTops[path.join(cwd, "src/a.ts")], 50);
  assert.equal(migrated.fileTops["/external/b.ts"], 90);
  assert.deepEqual(await migrateExplorerPaths(migrated, cwd), migrated);
});

test("MCP root removal updates the session while dirty tabs remain open and writable", async (t) => {
  const { cwd, roots, session } = await fixture(t);
  const [one, two] = roots.map((root) => path.join(root.path, "same.txt"));
  await fs.writeFile(one, "first");
  await fs.writeFile(two, "second");
  const originalWindow = global.window;
  global.window = { birdsong: {
    readSessionFile: (_id, file) => readSessionFile(cwd, file),
    writeSessionFile: (_id, file, text, base) => writeSessionFile(cwd, file, text, base),
  } };
  t.after(() => { global.window = originalWindow; });
  explorerStore.openFile(session.id, one);
  explorerStore.openFile(session.id, two);
  await fileBufferStore.load(session.id, two);
  const buffer = fileBufferStore.get(session.id, two);
  const edited = buffer.live.state.update({ changes: { from: 0, to: buffer.live.state.doc.length, insert: "unsaved edits" } }).state;
  fileBufferStore.noteEdit(session.id, two, edited);
  const opened = explorerStore.get(session.id).openFiles;
  let renderedSession = structuredClone(session);
  const savedPath = path.join(cwd, "session-meta.json");
  let updates = 0;
  const folders = new SessionWorkingFolders({
    getSession: () => session, ensure: async () => session,
    save: (value) => fs.writeFile(savedPath, JSON.stringify(value)),
    emit: () => {
      renderedSession = shareSession(renderedSession, structuredClone(session));
      updates++;
      refreshSessionFiles(session.id, null);
    },
  });
  const result = await callBirdsongTool({ workingFolders: folders }, session.id, "remove_working_folder",
    { folderId: roots[1].id }, new AbortController().signal);
  assert.equal(result.isError, undefined);
  assert.equal(updates, 1);
  assert.deepEqual(renderedSession.workingFolders, [roots[0]]);
  assert.deepEqual(JSON.parse(await fs.readFile(savedPath, "utf8")).workingFolders, [roots[0]]);
  await fileBufferStore.reload(session.id, two);
  assert.equal(explorerStore.get(session.id).openFiles, opened);
  assert.equal(explorerStore.get(session.id).activeFile, two);
  assert.equal(fileBufferStore.get(session.id, two).live.state, edited);
  assert.equal(fileBufferStore.isDirty(session.id, two), true);
  assert.equal(await fileBufferStore.save(session.id, two), true);
  assert.equal(await fs.readFile(two, "utf8"), "unsaved edits");
  assert.equal(await fs.readFile(one, "utf8"), "first");
  assert.equal(fileBufferStore.isDirty(session.id, two), false);
});

test("tree mutations resolve the correct root and protect registered roots even when nested", async (t) => {
  const { cwd, roots, session } = await fixture(t);
  const file = path.join(roots[1].path, "file.ts");
  await fs.writeFile(file, "text");
  const root = workingFolderRoot(session, file, true);
  assert.equal(root, roots[1].path);
  await renameSessionFile(root, file, "renamed.ts");
  assert.equal(await fs.readFile(path.join(root, "renamed.ts"), "utf8"), "text");
  assert.throws(() => workingFolderRoot(session, path.join(cwd, "outside.ts")), /outside/);
  session.workingFolders = [{ id: "parent", path: cwd }, ...roots];
  assert.throws(() => workingFolderRoot(session, roots[0].path, true), /cannot/);
  assert.equal(workingFolderRoot(session, path.join(roots[0].path, "a.ts")), roots[0].path);
});

test("root reorder keeps expansion and file identities; missing roots remain visible", () => {
  const folders = [{ id: "one", path: "/repo" }, { id: "two", path: "/worktree" }];
  const listings = {
    "/repo": { entries: [{ name: "src", kind: "dir" }] },
    "/repo/src": { entries: [{ name: "same.ts", kind: "file" }] },
    "/worktree": { error: "ENOENT" },
  };
  const expanded = new Set(["/repo/src"]);
  const rows = visibleTreeRows(listings, expanded, [...folders].reverse(), []);
  assert.deepEqual(rows.map((row) => row.path), ["/worktree", "/repo", "/repo/src", "/repo/src/same.ts"]);
  assert.equal(rows[0].error, "ENOENT");
  const collapsed = visibleTreeRows(listings, expanded, folders, ["/repo"]);
  assert.deepEqual(collapsed.map((row) => row.path), ["/repo", "/worktree"]);
});

test("nested roots give duplicate visible file paths separate row identities", () => {
  const folders = [{ id: "one", path: "/repo" }, { id: "two", path: "/repo/tree" }];
  const listings = {
    "/repo": { entries: [{ name: "tree", kind: "dir" }] },
    "/repo/tree": { entries: [{ name: "a.ts", kind: "file" }] },
  };
  const rows = visibleTreeRows(listings, new Set(["/repo/tree"]), folders, []);
  const repeated = rows.filter((row) => row.path === "/repo/tree/a.ts");
  assert.equal(repeated.length, 2);
  assert.notEqual(repeated[0].folderId, repeated[1].folderId);
});

test("Go to File only offers folders within listed roots", () => {
  const entries = pathEntries(["/Users/me/repo/src/a.ts", "/tmp/tree/a.ts"], ["/Users/me/repo", "/tmp/tree"]);
  assert.deepEqual(entries.filter((entry) => entry.kind === "dir").map((entry) => entry.path),
    ["/Users/me/repo/src", "/Users/me/repo", "/tmp/tree"]);
});

test("revealing an absolute file opens its collapsed root and retains other sessions' state", () => {
  explorerStore.setRootCollapsed("reveal", "/repo", true);
  const other = explorerStore.get("untouched");
  explorerStore.revealFile("reveal", "/repo/src/a.ts");
  const state = explorerStore.get("reveal");
  assert.deepEqual(state.collapsedRoots, []);
  assert.ok(state.expanded.includes("/repo/src"));
  assert.equal(state.activeFile, "/repo/src/a.ts");
  assert.equal(explorerStore.get("untouched"), other);
});

test("session status updates preserve unchanged working folder props", () => {
  const previous = { id: "one", status: "ready", workingFolders: [{ id: "root", path: "/repo" }] };
  const next = shareSession(previous, { ...structuredClone(previous), status: "running" });
  assert.notEqual(next, previous);
  assert.equal(next.workingFolders, previous.workingFolders);
  assert.equal(next.workingFolders[0], previous.workingFolders[0]);
});

test("live watches cover both roots and stop watching a removed root", async (t) => {
  const { roots, session } = await fixture(t);
  const watcher = new SessionFileWatcher();
  t.after(() => watcher.dispose());
  const events = [];
  const sender = { isDestroyed: () => false, send: (_channel, event) => events.push(event) };
  const waitFor = async (predicate, pulse) => {
    const deadline = Date.now() + 5000;
    while (!predicate() && Date.now() < deadline) {
      if (pulse) await pulse();
      await delay(30);
    }
    assert.ok(predicate(), JSON.stringify(events));
  };
  watcher.watch(session.id, roots, sender);
  const files = roots.map((root) => path.join(root.path, "changed.ts"));
  // macOS can start delivering recursive events after watch() returns. Keep producing changes
  // until both watches have observed them rather than racing a single initial write.
  await waitFor(() => files.every((file) => events.some((event) => event.paths?.includes(file))),
    () => Promise.all(files.map((file) => fs.writeFile(file, "one"))));
  assert.ok(events.every((event) => roots.some((root) => root.id === event.folderId)));
  watcher.refresh(session.id, [roots[1]]);
  events.length = 0;
  await waitFor(() => events.some((event) => event.paths?.includes(files[1])),
    () => Promise.all(files.map((file) => fs.writeFile(file, "two"))));
  await delay(250);
  assert.ok(events.every((event) => event.folderId === roots[1].id));
});
