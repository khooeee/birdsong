import type { Theme } from "../../../shared/appSettings";
import type { AgentKind } from "../../../shared/agentKind";
import type { VoiceReasoningEffort } from "../../../shared/voiceReasoningEffort";

/** Settings modal form state; number fields stay text while typing. */
export type SettingsDraft = {
  theme: Theme;
  soundEnabled: boolean;
  sessionListMax: string;
  homeCwd: string;
  homeAgent: AgentKind;
  /** mcp.json text; null until edited, so an untouched box keeps the file. */
  mcpServers: string | null;
  /** null until edited, so an untouched field keeps the saved key. */
  voiceKey: string | null;
  voiceModel: string;
  voiceReasoning: VoiceReasoningEffort;
  voiceName: string;
  voiceLanguage: string;
  voiceIdleMinutes: string;
  remoteEnabled: boolean;
  controlPort: string;
  apnsKeyId: string;
  apnsTeamId: string;
};
