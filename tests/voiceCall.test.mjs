import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { fakeInworld as inworld } from "./fixtures/fakeInworld.mjs";

process.env.BIRDSONG_TEST_USER_DATA = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-voice-"));
const jiti = createJiti(import.meta.url, {
  alias: { electron: fileURLToPath(new URL("./fixtures/electron.cjs", import.meta.url)) },
});
const { VoiceCall } = await jiti.import("../src/main/voice/VoiceCall.ts");
const { CurrentVoiceCall } = await jiti.import("../src/main/voice/CurrentVoiceCall.ts");
const { handleVoiceRequest } = await jiti.import("../src/main/control/voiceRoutes.ts");
const settle = () => new Promise((resolve) => setImmediate(resolve));

function handlers() {
  const events = [];
  const ended = [];
  return { events, ended, onEvent: (event) => events.push(event), onEnded: (reason) => ended.push(reason) };
}

test("a call posts the offer, attaches a sideband to its id, and passes events both ways", async (t) => {
  const { requests, sockets } = inworld(t);
  const h = handlers();
  const call = new VoiceCall("KEY", h);

  assert.equal(await call.answer("offer-sdp"), "answer-1");
  assert.deepEqual(requests[0], { url: "https://api.inworld.ai/v1/realtime/calls", method: "POST", auth: "Basic KEY", body: "offer-sdp" });
  assert.equal(sockets[0].url, "wss://api.inworld.ai/v1/realtime?call_id=call-1");
  assert.equal(sockets[0].auth, "Basic KEY");

  sockets[0].receive({ type: "response.output_audio_transcript.delta", delta: "Hi" });
  sockets[0].receive({ type: "response.done" });
  assert.deepEqual(h.events, [{ type: "response.done" }]);
  call.send({ type: "response.create" });
  assert.deepEqual(sockets[0].sent, [{ type: "response.create" }]);
});

test("a dropped sideband reattaches to the same call, and reports the call ended once it can't", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let refuse = false;
  const { sockets } = inworld(t, { refuseAttach: () => refuse });
  const h = handlers();
  const call = new VoiceCall("KEY", h);
  await call.answer("offer");

  sockets[0].close();
  t.mock.timers.tick(500);
  await settle();
  await settle();
  assert.equal(sockets.length, 2);
  assert.equal(sockets[1].url, sockets[0].url);
  sockets[1].receive({ type: "response.done" });
  assert.equal(h.events.length, 1);

  refuse = true;
  sockets[1].close();
  for (const delay of [500, 1500, 3000]) {
    t.mock.timers.tick(delay);
    await settle();
    await settle();
  }
  assert.equal(sockets.length, 5);
  assert.deepEqual(h.ended, ["The voice call ended."]);
});

test("ending a call hangs it up and drops its later events", async (t) => {
  const { requests, sockets } = inworld(t);
  const h = handlers();
  const call = new VoiceCall("KEY", h);
  await call.answer("offer");

  call.end();
  sockets[0].receive({ type: "response.done" });
  assert.deepEqual(h.events, []);
  assert.deepEqual(h.ended, []);
  assert.equal(requests.at(-1).url, "https://api.inworld.ai/v1/realtime/calls/call-1/hangup");
  assert.equal(requests.at(-1).method, "POST");
});

test("a sideband that won't attach fails the answer and hangs up the call", async (t) => {
  const { requests } = inworld(t, { refuseAttach: () => true });
  const call = new VoiceCall("KEY", handlers());
  await assert.rejects(call.answer("offer"), /Could not attach/);
  assert.equal(requests.at(-1).url, "https://api.inworld.ai/v1/realtime/calls/call-1/hangup");
});

test("a new call replaces the old one, whose events no longer get through", async (t) => {
  const { sockets } = inworld(t);
  const h = handlers();
  const current = new CurrentVoiceCall(h);
  await current.open("KEY", "offer-1");
  const first = current.current;
  await current.open("KEY", "offer-2");

  assert.notEqual(current.current, first);
  sockets[0].receive({ type: "old" });
  sockets[1].receive({ type: "new" });
  assert.deepEqual(h.events, [{ type: "new" }]);
  assert.equal(sockets[0].readyState, 3);
});

function request(method, body) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  req.method = method;
  return req;
}

async function route(voice, method, pathname, body) {
  const res = {
    writeHead(status) {
      this.status = status;
    },
    end(text) {
      this.body = JSON.parse(text);
    },
  };
  await handleVoiceRequest(request(method, body), res, pathname, voice);
  return res;
}

test("the phone's voice routes start, refuse a stale resume, answer, open and stop", async () => {
  const calls = [];
  const voice = {
    getStatus: () => ({ state: "off", activity: "idle", error: "Lost the connection to the phone.", peer: "phone" }),
    startPhone: async (resume, reason) => {
      calls.push(["start", resume, reason]);
      return resume ? null : [{ urls: "turn:x" }];
    },
    answer: async (sdp, peer) => {
      calls.push(["answer", sdp, peer]);
      return "answer-sdp";
    },
    open: (peer) => calls.push(["open", peer]),
    stopPhone: () => calls.push(["stop"]),
  };

  assert.deepEqual((await route(voice, "POST", "/voice/start", {})).body, { iceServers: [{ urls: "turn:x" }] });
  const resume = await route(voice, "POST", "/voice/start", { resume: true, reason: "Wi-Fi changed" });
  assert.equal(resume.status, 409);
  assert.equal(resume.body.error, "Lost the connection to the phone.");
  assert.equal((await route(voice, "POST", "/voice/answer", {})).status, 400);
  assert.deepEqual((await route(voice, "POST", "/voice/answer", { sdp: "offer" })).body, { sdp: "answer-sdp" });
  await route(voice, "POST", "/voice/open");
  await route(voice, "POST", "/voice/stop");
  assert.equal((await route(voice, "GET", "/voice")).body.peer, "phone");
  assert.deepEqual(calls, [
    ["start", false, undefined],
    ["start", true, "Wi-Fi changed"],
    ["answer", "offer", "phone"],
    ["open", "phone"],
    ["stop"],
  ]);
});
