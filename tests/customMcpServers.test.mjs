import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { parseMcpFile } = await jiti.import("../src/main/mcp/parseMcpFile.ts");

test("accepts stdio and http servers", () => {
  const { servers, errors } = parseMcpFile({ mcpServers: [
    { type: "stdio", name: "files", command: "npx", args: ["-y", "x"], env: [{ name: "K", value: "v" }] },
    { type: "http", name: "remote", url: "https://example.com/mcp", headers: [{ name: "A", value: "b" }] },
  ] });
  assert.deepEqual(errors, []);
  assert.equal(servers.length, 2);
  assert.ok("command" in servers[0]);
  assert.equal(servers[1].type, "http");
});

test("expands ${VAR} and defaults missing pieces", () => {
  process.env.BIRDSONG_TEST_VAR = "hi";
  const { servers, errors } = parseMcpFile({ mcpServers: [
    { type: "stdio", name: "a", command: "${BIRDSONG_TEST_VAR}-cmd", args: ["${MISSING_VAR_NOPE}x"] },
    { type: "http", name: "b", url: "https://example.com" },
  ] });
  delete process.env.BIRDSONG_TEST_VAR;
  assert.deepEqual(errors, []);
  assert.equal(servers[0].command, "hi-cmd");
  assert.deepEqual(servers[0].args, ["x"]);
  assert.deepEqual(servers[0].env, []);
  assert.deepEqual(servers[1].headers, []);
});

test("skips bad entries but keeps the good ones", () => {
  const { servers, errors } = parseMcpFile({ mcpServers: [
    { type: "stdio", name: "ok", command: "x" },
    { type: "sse", name: "old", url: "https://example.com" },
    { type: "stdio", name: "no-command" },
    { type: "http", name: "no-url" },
    { type: "stdio", name: "birdsong", command: "x" },
    { type: "stdio", name: "ok", command: "y" },
    "nope",
  ] });
  assert.equal(servers.length, 1);
  assert.equal(servers[0].name, "ok");
  assert.equal(errors.length, 6);
});

test("skips disabled servers silently", () => {
  const { servers, errors } = parseMcpFile({ mcpServers: [
    { type: "stdio", name: "off", command: "x", enabled: false },
    { type: "stdio", name: "on", command: "x", enabled: true },
    { type: "stdio", name: "default", command: "x" },
    { type: "stdio", name: "bad-flag", command: "x", enabled: "no" },
  ] });
  assert.deepEqual(servers.map((s) => s.name), ["on", "default"]);
  assert.equal(errors.length, 1);
});

test("rejects a missing mcpServers list", () => {
  const { servers, errors } = parseMcpFile({});
  assert.deepEqual(servers, []);
  assert.equal(errors.length, 1);
});
