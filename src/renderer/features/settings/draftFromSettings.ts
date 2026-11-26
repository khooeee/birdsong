import type { AppSettings } from "../../../shared/appSettings";
import type { SettingsDraft } from "./SettingsDraft";

export function draftFromSettings(prefs: AppSettings): SettingsDraft {
  return {
    theme: prefs.theme,
    soundEnabled: prefs.soundEnabled,
    sessionListMax: String(prefs.sessionListMax),
    homeCwd: prefs.homeCwd,
    homeAgent: prefs.homeAgent,
    mcpServers: null,
    voiceKey: null,
    voiceModel: prefs.voiceModel,
    voiceReasoning: prefs.voiceReasoning,
    voiceName: prefs.voiceName,
    voiceLanguage: prefs.voiceLanguage,
    voiceIdleMinutes: String(prefs.voiceIdleMinutes),
    remoteEnabled: prefs.remoteEnabled,
    controlPort: String(prefs.controlPort),
    tailscaleServePort: String(prefs.tailscaleServePort),
    apnsKeyId: prefs.apnsKeyId,
    apnsTeamId: prefs.apnsTeamId,
  };
}
