import type { AgentKind } from "../../../shared/agentKind";
import { continueTitle } from "../../../shared/continueTitle";
import type { Session } from "../../../shared/session";
import { railModeStore } from "../explorer/railModeStore";
import { resumeHandoffPrompt } from "./resumeHandoffPrompt";

/** Open a new session with another agent and ask it to continue this one's work. */
export function resumeElsewhere(source: Session, agent: AgentKind, pinned: boolean): void {
  railModeStore.set("sessions");
  void handOff(source, agent, pinned).catch(console.error);
}

async function handOff(source: Session, agent: AgentKind, pinned: boolean): Promise<void> {
  const session = await window.birdsong.createSession({
    agent,
    cwd: source.cwd,
    title: continueTitle(source.title, agent),
    pin: pinned,
  });
  if (session.status === "error") return;
  for (const folder of source.workingFolders) {
    await window.birdsong.addWorkingFolder(session.id, folder.path).catch(console.error);
  }
  await window.birdsong.sendPrompt(session.id, resumeHandoffPrompt(source));
}
