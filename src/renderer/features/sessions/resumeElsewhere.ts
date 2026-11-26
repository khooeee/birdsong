import type { AgentKind } from "../../../shared/agentKind";
import type { Session } from "../../../shared/session";
import { railModeStore } from "../explorer/railModeStore";

/** Open a new session with another agent and ask it to continue this one's work. */
export function resumeElsewhere(source: Session, agent: AgentKind, pinned: boolean): void {
  railModeStore.set("sessions");
  void window.birdsong.continueSession(source.id, agent, pinned).catch(console.error);
}
