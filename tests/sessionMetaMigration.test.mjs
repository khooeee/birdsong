import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { electron: fileURLToPath(new URL("./fixtures/electron.cjs", import.meta.url)) },
});
const { loadSessionMeta } = await jiti.import("../src/main/storage/sessionMeta.ts");

test("loading legacy metadata persists its canonical root before a cwd symlink can be retargeted", async (t) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-meta-"));
  const cwd = await fs.realpath(temporary);
  const oldUserData = process.env.BIRDSONG_TEST_USER_DATA;
  process.env.BIRDSONG_TEST_USER_DATA = path.join(cwd, "app-data");
  t.after(async () => {
    if (oldUserData === undefined) delete process.env.BIRDSONG_TEST_USER_DATA;
    else process.env.BIRDSONG_TEST_USER_DATA = oldUserData;
    await fs.rm(cwd, { recursive: true, force: true });
  });
  const one = path.join(cwd, "one");
  const two = path.join(cwd, "two");
  const alias = path.join(cwd, "project");
  await fs.mkdir(one);
  await fs.mkdir(two);
  await fs.symlink(one, alias, "dir");
  const metaFile = path.join(process.env.BIRDSONG_TEST_USER_DATA, "sessions/legacy/meta.json");
  await fs.mkdir(path.dirname(metaFile), { recursive: true });
  await fs.writeFile(metaFile, JSON.stringify({ title: "Existing session", agent: "codex", cwd: alias, agentSessionId: null }));
  const loaded = await loadSessionMeta("legacy");
  assert.deepEqual(loaded.workingFolders, [{ id: "session", path: one }]);
  assert.deepEqual(JSON.parse(await fs.readFile(metaFile, "utf8")).workingFolders, loaded.workingFolders);
  await fs.unlink(alias);
  await fs.symlink(two, alias, "dir");
  const reopened = await loadSessionMeta("legacy");
  assert.deepEqual(reopened.workingFolders, loaded.workingFolders);
  assert.equal(reopened.cwd, alias);
  assert.equal(reopened.title, "Existing session");
});
