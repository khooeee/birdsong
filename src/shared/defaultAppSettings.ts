import type { AppSettings } from "./appSettings";

export function defaultAppSettings(): AppSettings {
  return {
    theme: "dark",
    zenMode: true,
    soundEnabled: true,
    railWidth: 160,
    railMode: "sessions",
    explorerWidth: 240,
    editorWordWrap: false,
    rightRailWidth: 320,
    composerHeight: 72,
    lastAgent: "claude",
    lastCwd: "",
    recentCwds: [],
    lastPin: false,
    homeCwd: "",
    homeAgent: "claude",
    sessionListMax: 500,
    voiceModel: "inworld/models/mimo-v2.6-pro",
    voiceReasoning: "NONE",
    voiceName: "Sarah",
    voiceLanguage: "English",
    voiceIdleMinutes: 30,
    remoteEnabled: false,
    controlPort: 7389,
    tailscaleServePort: 8443,
    apnsKeyId: "",
    apnsTeamId: "",
    apnsKeyPath: "",
  };
}
