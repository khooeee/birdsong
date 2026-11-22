import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { fakeInworld } from "./fixtures/fakeInworld.mjs";

process.env.BIRDSONG_TEST_USER_DATA = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-voice-picker-"));
await fs.writeFile(path.join(process.env.BIRDSONG_TEST_USER_DATA, "inworld-key.enc"), "ZW5j");
const jiti = createJiti(import.meta.url, {
  alias: { electron: fileURLToPath(new URL("./fixtures/voiceElectron.cjs", import.meta.url)) },
});
const { listInworldVoices } = await jiti.import("../src/main/voice/listInworldVoices.ts");
const { voicePreviews } = await jiti.import("../src/main/voice/voicePreviews.ts");
const { filterVoices } = await jiti.import("../src/renderer/features/voicePicker/filterVoices.ts");
const { findVoice } = await jiti.import("../src/renderer/features/voicePicker/findVoice.ts");

const voice = (voiceId, extra = {}) => ({
  voiceId, displayName: voiceId, description: "", gender: "", languageCode: "en-US", source: "SYSTEM", ...extra,
});

test("the voice list follows every page and drops duplicate and malformed entries", async (t) => {
  const pages = {
    "": { voices: [{ voiceId: "Ashley", displayName: "Ashley", gender: "female", langCode: "EN_US", source: "SYSTEM" }, { displayName: "no id" }], nextPageToken: "p2" },
    p2: { voices: [{ voiceId: "Ashley" }, { voiceId: "ws__mine", displayName: "Mine", source: "IVC", languageCode: "en-GB" }], nextPageToken: "" },
  };
  const { requests } = fakeInworld(t, {
    respond: (url) => (url.pathname === "/voices/v1/voices" ? Response.json(pages[url.searchParams.get("pageToken") ?? ""]) : null),
  });

  const voices = await listInworldVoices("KEY");
  assert.deepEqual(voices, [
    { voiceId: "Ashley", displayName: "Ashley", description: "", gender: "female", languageCode: "EN_US", source: "SYSTEM" },
    { voiceId: "ws__mine", displayName: "Mine", description: "", gender: "", languageCode: "en-GB", source: "IVC" },
  ]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].auth, "Basic KEY");
  assert.equal(new URL(requests[1].url).searchParams.get("pageToken"), "p2");
  // Community voices stay out: no filter asks for them.
  assert.equal(new URL(requests[0].url).searchParams.get("filter"), null);
});

test("voice samples are fetched once per voice, and failures are retried", async (t) => {
  let fail = true;
  const { requests } = fakeInworld(t, {
    respond: (url) => {
      if (url.pathname !== "/tts/v1/voice:preview") return null;
      if (fail) return Response.json({ message: "Too many requests" }, { status: 429 });
      return Response.json({ audioContent: Buffer.from("mp3").toString("base64") });
    },
  });
  t.after(() => voicePreviews.clear());

  await assert.rejects(voicePreviews.get("Ashley"), /Too many requests/);
  fail = false;
  assert.equal(Buffer.from(await voicePreviews.get("Ashley")).toString(), "mp3");
  await voicePreviews.get(" Ashley ");
  assert.equal(requests.length, 2);
  const url = new URL(requests[1].url);
  assert.equal(url.searchParams.get("voice_id"), "Ashley");
  assert.equal(url.searchParams.get("model_id"), "inworld-tts-2");
  await assert.rejects(voicePreviews.get("  "), /Choose a voice/);
});

test("searching voices matches every word, listing the workspace's own voices first", () => {
  const voices = [
    voice("Sarah", { gender: "female", description: "Warm and calm" }),
    voice("Dennis", { gender: "male" }),
    voice("ws__clone", { displayName: "Chris", source: "IVC" }),
    voice("Ashley", { gender: "female", languageCode: "en-GB" }),
  ];
  assert.deepEqual(filterVoices(voices, "").map((v) => v.voiceId), ["ws__clone", "Ashley", "Dennis", "Sarah"]);
  assert.deepEqual(filterVoices(voices, "female").map((v) => v.voiceId), ["Ashley", "Sarah"]);
  assert.deepEqual(filterVoices(voices, "female calm").map((v) => v.voiceId), ["Sarah"]);
  assert.deepEqual(filterVoices(voices, "mine").map((v) => v.voiceId), ["ws__clone"]);
  assert.deepEqual(filterVoices(voices, "nobody"), []);
});

test("the saved voice is found by id first, then by id or name ignoring case", () => {
  const voices = [voice("ws__x", { displayName: "Sarah", source: "IVC" }), voice("Sarah")];
  assert.equal(findVoice(voices, "Sarah").voiceId, "Sarah");
  assert.equal(findVoice(voices, "sarah").voiceId, "ws__x");
  assert.equal(findVoice(voices, "WS__X").voiceId, "ws__x");
  assert.equal(findVoice(voices, " "), undefined);
  assert.equal(findVoice(voices, "Nobody"), undefined);
});
