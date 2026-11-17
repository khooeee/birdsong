import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { ancestorPaths } = await jiti.import("../src/renderer/features/explorer/ancestorPaths.ts");
const { childPath } = await jiti.import("../src/renderer/features/explorer/childPath.ts");
const { visibleTreeRows } = await jiti.import("../src/renderer/features/explorer/visibleTreeRows.ts");
const { treeKeyAction } = await jiti.import("../src/renderer/features/explorer/treeKeyAction.ts");
const { explorerStore } = await jiti.import("../src/renderer/features/explorer/explorerStore.ts");

function nestedRows() {
  return visibleTreeRows({
    "/repo": { entries: [{ name: "tree", kind: "dir" }] },
    "/repo/tree": { entries: [{ name: "same.txt", kind: "file" }] },
  }, new Set(["/repo/tree"]), [{ id: "parent", path: "/repo" }, { id: "nested", path: "/repo/tree" }], []);
}

test("nested root headers and child rows have distinct click/keyboard identities", () => {
  const rows = nestedRows();
  const child = rows.find((row) => row.path === "/repo/tree" && !row.rootId);
  const header = rows.find((row) => row.rootId === "nested");
  assert.notEqual(child.id, header.id);
  const childAction = treeKeyAction(rows, child.id, "Enter");
  const rootAction = treeKeyAction(rows, header.id, "Enter");
  assert.equal(childAction.row, child);
  assert.equal(childAction.row.rootId, undefined);
  assert.equal(rootAction.row, header);
  assert.equal(rootAction.row.rootId, "nested");
  assert.equal(childAction.open, false);
  assert.equal(rootAction.open, false);
});

test("keyboard navigation and parent selection remain in the selected root appearance", () => {
  const rows = nestedRows();
  const header = rows.find((row) => row.rootId === "nested");
  const file = rows.find((row) => row.folderId === "nested" && row.kind === "file");
  assert.equal(treeKeyAction(rows, header.id, "ArrowRight").row, file);
  assert.equal(treeKeyAction(rows, file.id, "ArrowLeft").row, header);
  assert.equal(treeKeyAction(rows, file.id, "ArrowUp").row, header);
  assert.equal(treeKeyAction(rows, header.id, "ArrowDown").row, file);
});

test("filesystem root paths stay absolute throughout tree traversal", () => {
  assert.equal(childPath("/", "etc"), "/etc");
  assert.equal(childPath("/etc/", "config"), "/etc/config");
  const rows = visibleTreeRows({
    "/": { entries: [{ name: "etc", kind: "dir" }] },
    "/etc": { entries: [{ name: "config", kind: "file" }] },
  }, new Set(["/etc"]), [{ id: "filesystem", path: "/" }], []);
  assert.deepEqual(rows.map((row) => row.path), ["/", "/etc", "/etc/config"]);
});

test("revealing files and folders reopens a collapsed filesystem root", () => {
  assert.deepEqual(ancestorPaths("/etc/config"), ["/", "/etc"]);
  assert.deepEqual(ancestorPaths("/config"), ["/"]);
  assert.deepEqual(ancestorPaths("/"), []);
  assert.deepEqual(ancestorPaths("src/a.ts"), ["src"]);
  explorerStore.setRootCollapsed("filesystem", "/", true);
  explorerStore.revealFile("filesystem", "/config");
  assert.deepEqual(explorerStore.get("filesystem").collapsedRoots, []);
  explorerStore.setRootCollapsed("filesystem", "/", true);
  explorerStore.revealFolder("filesystem", "/etc");
  assert.deepEqual(explorerStore.get("filesystem").collapsedRoots, []);
});
