import { useEffect } from "react";
import { VoiceConnection } from "./VoiceConnection";

/** Own the voice WebRTC connection for the window's lifetime and obey main's commands. */
export function useVoiceConnection(): void {
  useEffect(() => {
    const connection = new VoiceConnection();
    const offCommand = window.birdsong.onVoiceCommand((command) => connection.handle(command));
    // After a reload main may think voice is still connected; this lets it reconnect.
    window.birdsong.voiceConnection({ type: "ready" });
    return () => {
      offCommand();
      connection.disconnect();
    };
  }, []);
}
