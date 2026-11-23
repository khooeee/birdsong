import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { handleControlRequest } = await jiti.import("../src/main/control/controlRoutes.ts");
const { NewSessionDraft } = await jiti.import("../src/main/sessions/NewSessionDraft.ts");

async function post(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  Object.assign(req, { url: "/sessions", method: "POST" });
  const created = [];
  const sessions = { createSession: async (input) => (created.push(input), { id: "s", cwd: input.cwd }) };
  let status = 0;
  let payload = "";
  const res = { writeHead: (code) => { status = code; }, end: (text) => { payload = text; } };
  await handleControlRequest(req, res, true, "http://127.0.0.1", sessions);
  return { status, body: JSON.parse(payload), created };
}

test("POST /sessions asks before creating a missing folder, then creates it on retry", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-cwd-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const cwd = path.join(root, "new", "project");

  const refused = await post({ agent: "claude", cwd });
  assert.equal(refused.status, 409);
  assert.equal(refused.created.length, 0);
  await assert.rejects(fs.stat(cwd));

  const accepted = await post({ agent: "claude", cwd, createFolder: true });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.created.length, 1);
  assert.ok((await fs.stat(cwd)).isDirectory());
});

test("POST /sessions starts in an existing folder without asking", async (t) => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-cwd-"));
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  const { status, created } = await post({ agent: "claude", cwd });
  assert.equal(status, 200);
  assert.equal(created.length, 1);
});

test("the new session modal starts no agent in a missing folder", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-cwd-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const opened = [];
  const warm = { take: () => null };
  const draft = new NewSessionDraft(warm, (agent, cwd) => { opened.push(cwd); throw new Error("opened"); }, () => {});
  assert.equal(await draft.start("d", "claude", path.join(root, "missing")), null);
  assert.deepEqual(opened, []);
});
