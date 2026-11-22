import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { fakeInworld } from "./fixtures/fakeInworld.mjs";

process.env.BIRDSONG_TEST_USER_DATA = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-voice-agent-"));
await fs.writeFile(path.join(process.env.BIRDSONG_TEST_USER_DATA, "inworld-key.enc"), "ZW5j");
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const jiti = createJiti(import.meta.url, {
  alias: { electron: fixture("voiceElectron.cjs"), "./voiceInstructions.md?raw": fixture("voiceInstructions.cjs") },
});
const { VoiceAgent } = await jiti.import("../src/main/voice/VoiceAgent.ts");
const settle = () => new Promise((resolve) => setImmediate(resolve));

let settings = { voiceModel: "model", voiceReasoning: "DEFAULT", voiceLanguage: "English", voiceName: "Ava", voiceIdleMinutes: 0 };

function agent(t, options) {
  const inworld = fakeInworld(t, options);
  const commands = [];
  const window = {
    webContents: {
      send(channel, payload) {
        if (channel === "voice:command") commands.push(payload.type);
      },
    },
  };
  const voice = new VoiceAgent({ sessions: { getSettings: () => settings }, getWindow: () => window });
  t.after(() => voice.stop());
  return { voice, commands, ...inworld };
}

async function phoneOn(voice, offer = "phone-offer") {
  await voice.startPhone(false);
  const answer = await voice.answer(offer, "phone");
  voice.open("phone");
  return answer;
}

test("the phone starts voice and main configures its call over the sideband", async (t) => {
  const { voice, commands, sockets } = agent(t);
  assert.deepEqual(await voice.startPhone(false), [{ urls: "turn:inworld" }]);
  assert.deepEqual(voice.getStatus(), { state: "connecting", activity: "idle", error: null, peer: "phone" });
  await assert.rejects(voice.answer("offer", "desktop"), /not connecting/);

  assert.equal(await voice.answer("offer", "phone"), "answer-1");
  assert.equal(sockets[0].sent[0].type, "session.update");
  voice.open("phone");
  assert.equal(voice.getStatus().state, "listening");
  assert.deepEqual(commands, []);
});

test("stopping on the Mac hangs up the phone's call and refuses its resume", async (t) => {
  const { voice, requests } = agent(t);
  await phoneOn(voice);
  await voice.toggle();

  assert.equal(voice.getStatus().state, "off");
  assert.equal(requests.at(-1).url, "https://api.inworld.ai/v1/realtime/calls/call-1/hangup");
  assert.equal(await voice.startPhone(true, "The call closed."), null);
});

test("the phone takes over from the desktop, keeping the conversation", async (t) => {
  const { voice, commands, sockets, requests } = agent(t);
  await voice.start();
  await voice.answer("desktop-offer", "desktop");
  voice.handleConnection({ type: "open" });
  sockets[0].receive({ type: "conversation.item.input_audio_transcription.completed", transcript: "check the deploy" });

  await voice.startPhone(false);
  assert.deepEqual(commands, ["connect", "disconnect"]);
  assert.ok(requests.some((r) => r.url.endsWith("/calls/call-1/hangup")));
  // The window reloading no longer matters: the phone has voice.
  voice.handleConnection({ type: "ready" });
  assert.equal(voice.getStatus().peer, "phone");

  await voice.answer("phone-offer", "phone");
  voice.open("phone");
  const replay = sockets[1].sent.find((event) => event.type === "conversation.item.create");
  assert.match(replay.item.content[0].text, /check the deploy/);
  assert.equal(voice.getStatus().state, "listening");
});

test("when the phone's call ends, main waits for it to resume, then gives up", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let refuse = false;
  const { voice, sockets } = agent(t, { refuseAttach: () => refuse });
  await phoneOn(voice);

  refuse = true;
  sockets[0].close();
  for (const delay of [500, 1500, 3000]) {
    t.mock.timers.tick(delay);
    await settle();
    await settle();
  }
  assert.equal(voice.getStatus().state, "connecting");
  assert.deepEqual(await voice.startPhone(true, "Wi-Fi changed"), [{ urls: "turn:inworld" }]);

  t.mock.timers.tick(60_000);
  assert.deepEqual(voice.getStatus(), { state: "off", activity: "idle", error: "Lost the connection to the phone.", peer: "phone" });
});

test("changing the voice in settings switches a live phone call's voice without reconnecting", async (t) => {
  const { voice, sockets } = agent(t);
  voice.voiceChanged();
  assert.equal(sockets.length, 0);

  await phoneOn(voice);
  const before = sockets[0].sent.length;
  settings = { ...settings, voiceName: "Olivia" };
  t.after(() => (settings = { ...settings, voiceName: "Ava" }));
  voice.voiceChanged();

  assert.equal(sockets.length, 1);
  assert.deepEqual(sockets[0].sent.slice(before), [
    { type: "session.update", session: { type: "realtime", audio: { output: { model: "inworld-tts-2", voice: "Olivia" } } } },
  ]);
  assert.equal(voice.getStatus().state, "listening");
});
