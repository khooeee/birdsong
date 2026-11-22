import { ipcMain } from "electron";
import { isRecord } from "../../shared/isRecord";
import type { VoiceConnectionEvent } from "../../shared/voiceConnectionEvent";
import { readRecentVoiceLog } from "./readRecentVoiceLog";
import { voiceCatalog } from "./voiceCatalog";
import type { VoiceAgent } from "./VoiceAgent";
import { voiceKeyStore } from "./voiceKeyStore";
import { voicePreviews } from "./voicePreviews";

/** How many recent entries the Voice Log view loads. */
const VOICE_LOG_LIMIT = 300;

/** Renderer ↔ main voice channels: controls, key, voice list and samples, SDP exchange and connection state (main has the call's events). */
export function registerVoiceIpc(voice: VoiceAgent): void {
  ipcMain.handle("voice:toggle", () => voice.toggle());
  ipcMain.handle("voice:status", () => voice.getStatus());
  ipcMain.handle("voice:keyInfo", () => voiceKeyStore.info());
  ipcMain.handle("voice:setKey", async (_e, key: unknown) => {
    const value = typeof key === "string" ? key.trim() : "";
    await voiceKeyStore.write(value);
    voiceCatalog.clear();
    voicePreviews.clear();
    // The mic hides without a key, so don't leave voice running unseen.
    if (!value) voice.stop();
  });
  ipcMain.handle("voice:voices", (_e, refresh: unknown) => voiceCatalog.list(refresh === true));
  ipcMain.handle("voice:preview", (_e, voiceId: unknown) => voicePreviews.get(typeof voiceId === "string" ? voiceId : ""));
  ipcMain.handle("voice:answer", (_e, offer: unknown) => voice.answer(typeof offer === "string" ? offer : "", "desktop"));
  ipcMain.handle("voice:log", () => readRecentVoiceLog(VOICE_LOG_LIMIT));
  ipcMain.on("voice:connection", (_e, event: unknown) => {
    if (isRecord(event) && typeof event.type === "string") voice.handleConnection(event as VoiceConnectionEvent);
  });
}
