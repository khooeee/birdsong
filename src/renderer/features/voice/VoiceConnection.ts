import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import type { VoiceCommand } from "../../../shared/voiceCommand";
import { iceGatheringDone } from "./iceGatheringDone";

/**
 * The voice WebRTC peer: mic up, agent audio down. Main gets the call's events over its own sideband;
 * the `oai-events` channel only tells main when the call is open or gone.
 */
export class VoiceConnection {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private mic: MediaStream | null = null;
  private audio: HTMLAudioElement | null = null;
  /** Bumped on every connect/disconnect so callbacks from an old peer are ignored. */
  private generation = 0;

  handle(command: VoiceCommand): void {
    if (command.type === "connect") void this.connect(command.iceServers);
    else this.disconnect();
  }

  disconnect(): void {
    this.generation += 1;
    this.channel?.close();
    this.pc?.close();
    this.mic?.getTracks().forEach((track) => track.stop());
    if (this.audio) {
      this.audio.pause();
      this.audio.srcObject = null;
    }
    this.pc = null;
    this.channel = null;
    this.mic = null;
    this.audio = null;
  }

  private async connect(iceServers: RTCIceServer[]): Promise<void> {
    this.disconnect();
    const generation = this.generation;
    const current = () => generation === this.generation;
    const api = window.birdsong;
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!current()) {
        mic.getTracks().forEach((track) => track.stop());
        return;
      }
      this.mic = mic;
      const track = mic.getAudioTracks()[0];
      if (!track) throw new Error("No microphone found.");

      const pc = new RTCPeerConnection({ iceServers });
      this.pc = pc;
      const audio = new Audio();
      audio.autoplay = true;
      this.audio = audio;
      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      };
      pc.addTrack(track, mic);

      const channel = pc.createDataChannel("oai-events", { ordered: true });
      this.channel = channel;
      channel.onopen = () => current() && api.voiceConnection({ type: "open" });
      channel.onclose = () => current() && api.voiceConnection({ type: "closed" });
      pc.onconnectionstatechange = () => {
        if (current() && pc.connectionState === "failed") {
          api.voiceConnection({ type: "failed", error: "The voice connection failed." });
        }
      };

      await pc.setLocalDescription(await pc.createOffer());
      await iceGatheringDone(pc);
      const answer = await api.voiceAnswer(pc.localDescription?.sdp ?? "");
      if (!current()) return;
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (error) {
      if (!current()) return;
      this.disconnect();
      api.voiceConnection({ type: "failed", error: ipcErrorMessage(error) });
    }
  }
}
