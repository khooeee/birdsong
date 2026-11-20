import type { BrowserWindow } from "electron";
import type { VoiceCommand } from "../../shared/voiceCommand";
import type { VoiceLogEntry } from "../../shared/voiceLogEntry";
import type { VoiceStatus } from "../../shared/voiceStatus";

/** Main → renderer voice channels; the renderer owns the WebRTC audio while voice is on the desktop. */
export class VoiceRendererLink {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  command(command: VoiceCommand): void {
    this.post("voice:command", command);
  }

  status(status: VoiceStatus): void {
    this.post("voice:status", status);
  }

  logEntry(entry: VoiceLogEntry): void {
    this.post("voice:log-entry", entry);
  }

  openSettings(): void {
    this.post("settings:open");
  }

  private post(channel: string, payload?: unknown): void {
    this.getWindow()?.webContents.send(channel, payload);
  }
}
