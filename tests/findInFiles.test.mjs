import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { createJiti } from "jiti";

Object.defineProperty(globalThis, "navigator", { value: { platform: "MacIntel" }, configurable: true });
const jiti = createJiti(import.meta.url);
const { findInFiles } = await jiti.import("../src/main/files/findInFiles.ts");
const { fileShortcutCommand } = await jiti.import("../src/renderer/features/explorer/fileShortcutCommand.ts");
const run = promisify(execFile);

async function fixture(t) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-find-"));
  const root = await fs.realpath(temporary);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, folders: [{ id: "root", path: root }] };
}

test("finds literal text across working folders with exact CRLF and Unicode locations", async (t) => {
  const { root, folders } = await fixture(t);
  const other = path.join(root, "other");
  await fs.mkdir(other);
  await fs.writeFile(path.join(root, "first.txt"), "😀 [Hello]. [hello].\r\n  [HELLO].\r\n");
  await fs.writeFile(path.join(other, "second.txt"), "[hello].");
  const roots = [...folders, { id: "nested", path: other }];
  const result = await findInFiles(roots, "[hello].");
  assert.equal(result.matchCount, 4);
  assert.equal(result.files.length, 2); // Overlapping roots do not duplicate matches.
  assert.equal(result.truncated, false);
  assert.deepEqual(result.files[0].matches.map(({ line, column, length }) => ({ line, column, length })), [
    { line: 1, column: 4, length: 8 }, { line: 1, column: 13, length: 8 }, { line: 2, column: 3, length: 8 },
  ]);
  assert.equal((await findInFiles(roots, "[Hello].", true)).matchCount, 1);
  assert.equal((await findInFiles(roots, " ")).matchCount, 4);
});

test("Git ignores, binary files, oversized files and symlinks stay out of results", async (t) => {
  const { root, folders } = await fixture(t);
  await run("git", ["init", "--quiet", root]);
  await fs.writeFile(path.join(root, ".gitignore"), "ignored.txt\n");
  await fs.writeFile(path.join(root, "visible.txt"), "needle");
  await fs.writeFile(path.join(root, "ignored.txt"), "needle");
  await fs.writeFile(path.join(root, "binary.bin"), Buffer.from("needle\0"));
  await fs.writeFile(path.join(root, "huge.txt"), `needle${"x".repeat(2 * 1024 * 1024)}`);
  await fs.symlink(path.join(root, "visible.txt"), path.join(root, "link.txt"));
  const result = await findInFiles(folders, "needle");
  assert.equal(result.matchCount, 1);
  assert.equal(result.files[0].path, path.join(root, "visible.txt"));
});

test("long lines retain a bounded preview and the match's original column", async (t) => {
  const { root, folders } = await fixture(t);
  await fs.writeFile(path.join(root, "long.txt"), `${"x".repeat(5000)}needle${"x".repeat(5000)}`);
  const result = await findInFiles(folders, "needle");
  const [hit] = result.files[0].matches;
  assert.equal(hit.column, 5001);
  assert.equal(hit.preview.length, 240);
  assert.equal(hit.preview.slice(hit.previewColumn, hit.previewColumn + hit.length), "needle");
});

test("caps results, reporting truncation only when there are additional matches", async (t) => {
  const { root, folders } = await fixture(t);
  const file = path.join(root, "many.txt");
  await fs.writeFile(file, "needle\n".repeat(1000));
  const exact = await findInFiles(folders, "needle");
  assert.equal(exact.matchCount, 1000);
  assert.equal(exact.truncated, false);
  await fs.appendFile(file, "needle\n");
  const capped = await findInFiles(folders, "needle");
  assert.equal(capped.matchCount, 1000);
  assert.equal(capped.truncated, true);
});

test("empty queries and aborted searches return no results", async (t) => {
  const { root, folders } = await fixture(t);
  await fs.writeFile(path.join(root, "one.txt"), "needle");
  const empty = { files: [], matchCount: 0, truncated: false };
  assert.deepEqual(await findInFiles(folders, ""), empty);
  assert.deepEqual(await findInFiles(folders, "needle", false, AbortSignal.abort()), empty);
  const controller = new AbortController();
  const pending = findInFiles(folders, "needle", false, controller.signal);
  controller.abort();
  assert.deepEqual(await pending, empty);
});

test("Shift+Cmd+F searches folders while Cmd+F keeps searching the active file", () => {
  const event = { key: "F", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false };
  assert.equal(fileShortcutCommand(event), "birdsong:find-in-files");
  assert.equal(fileShortcutCommand({ ...event, shiftKey: false }), "birdsong:find-in-file");
  assert.equal(fileShortcutCommand({ ...event, altKey: true }), undefined);
  assert.equal(fileShortcutCommand({ ...event, ctrlKey: true }), undefined);
});
