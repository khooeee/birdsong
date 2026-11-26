import type { AgentKind } from "../../../shared/agentKind";
import type { Session } from "../../../shared/session";
import { railModeStore } from "../explorer/railModeStore";
import { resumeHandoffPrompt } from "./resumeHandoffPrompt";

/** Open a new session with another agent and ask it to continue this one's work. */
export function resumeElsewhere(source: Session, agent: AgentKind): void {
  railModeStore.set("sessions");
  void handOff(source, agent).catch(console.error);
}

async function handOff(source: Session, agent: AgentKind): Promise<void> {
  const session = await window.birdsong.createSession({
    agent,
    cwd: source.cwd,
    title: source.title,
  });
  if (session.status === "error") return;
  for (const folder of source.workingFolders) {
    await window.birdsong.addWorkingFolder(session.id, folder.path).catch(console.error);
  }
  await window.birdsong.sendPrompt(session.id, resumeHandoffPrompt(source));
}
