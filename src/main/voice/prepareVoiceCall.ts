import { ensureMicAccess } from "./ensureMicAccess";
import { fetchIceServers } from "./fetchIceServers";
import { voiceKeyStore } from "./voiceKeyStore";

/** The key and ICE servers for a new call; on the desktop, also this Mac's mic access. */
export async function prepareVoiceCall(
  desktop: boolean,
  openSettings: () => void,
): Promise<{ key: string; iceServers: RTCIceServer[] }> {
  const key = await voiceKeyStore.read();
  if (!key) {
    if (desktop) openSettings();
    throw new Error("Add your Inworld API key in Settings.");
  }
  if (desktop) await ensureMicAccess();
  return { key, iceServers: await fetchIceServers(key) };
}
