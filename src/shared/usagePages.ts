import type { AgentKind } from "./agentKind";
import type { UsagePage } from "./usagePage";

/**
 * Agents whose usage lives behind their web account. Birdsong links to the page rather than
 * reading private endpoints or stored credentials.
 */
export const USAGE_PAGES: Partial<Record<AgentKind, UsagePage>> = {
  copilot: { url: "https://github.com/settings/copilot" },
  cursor: { url: "https://cursor.com/dashboard/spending" },
  devin: { url: "https://app.devin.ai/settings/usage" },
  vibe: { url: "https://chat.mistral.ai/code", hint: "Click on user account on bottom left → select Limits" },
};
