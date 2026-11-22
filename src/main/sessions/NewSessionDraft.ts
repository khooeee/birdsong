import type { AgentKind } from "../../shared/agentKind";
import type { ConfigMenuCategory } from "../../shared/configMenuCategory";
import type { SessionConfigSelect } from "../../shared/sessionConfigSelect";
import type { WarmSessionPool } from "../acp/WarmSessionPool";
import type { AcpSession } from "../acp/session";

type Draft = {
  id: string;
  acp: AcpSession;
  ready: boolean;
  updating: boolean;
};

function configChoices(acp: AcpSession): SessionConfigSelect[] {
  return acp.config.list().filter((option): option is SessionConfigSelect =>
    option.type === "select" && (option.category === "model" || option.category === "thought_level"),
  );
}

/** Holds the modal's unprompted agent session until it is created or abandoned. */
export class NewSessionDraft {
  private draft: Draft | undefined;
  private unwatchCommands: (() => void) | undefined;

  constructor(
    private readonly warm: WarmSessionPool<AcpSession>,
    private readonly open: (agent: AgentKind, cwd: string) => AcpSession,
    private readonly send: (channel: string, payload: unknown) => void,
  ) {}

  async start(id: string, agent: AgentKind, cwd: string): Promise<SessionConfigSelect[]> {
    void this.discard().catch(() => undefined);
    const warm = this.warm.take(agent, cwd);
    const acp = warm?.acp ?? this.open(agent, cwd);
    const draft = { id, acp, ready: false, updating: false };
    this.draft = draft;
    this.watchCommands(draft, acp);
    try {
      const started = warm ? await warm.started : await acp.start({ quiet: true }).then(() => true);
      if (this.draft !== draft || acp.connectionClosed) throw new Error("Agent session closed");
      if (!started) throw new Error("Could not start the agent");
      draft.ready = true;
      return configChoices(acp);
    } catch (error) {
      await this.discard(id);
      throw error;
    }
  }

  async select(id: string, category: ConfigMenuCategory, value: string): Promise<SessionConfigSelect[]> {
    const draft = this.requireReady(id);
    const option = configChoices(draft.acp).find((option) => option.category === category);
    const choices = option?.options.flatMap((entry) => "group" in entry ? entry.options : [entry]);
    if (!option || !choices?.some((choice) => choice.value === value)) {
      throw new Error("This choice is no longer available");
    }
    draft.updating = true;
    try {
      if (option.currentValue !== value) await draft.acp.config.set(option.id, value);
      return configChoices(draft.acp);
    } finally {
      draft.updating = false;
    }
  }

  claim(id: string, agent: AgentKind, cwd: string): AcpSession {
    const draft = this.requireReady(id);
    if (draft.acp.agent !== agent || draft.acp.cwd !== cwd) throw new Error("Agent or folder changed");
    this.stopWatchingCommands();
    this.draft = undefined;
    return draft.acp;
  }

  async discard(id?: string): Promise<void> {
    const draft = this.draft;
    if (!draft || (id !== undefined && id !== draft.id)) return;
    this.stopWatchingCommands();
    this.draft = undefined;
    await draft.acp.dispose();
  }

  private watchCommands(draft: Draft, acp: AcpSession): void {
    this.stopWatchingCommands();
    this.unwatchCommands = acp.watchSlashCommands((commands) => {
      if (this.draft !== draft) return;
      this.send("sessionDraft:commands", { id: draft.id, commands: [...commands] });
    });
  }

  private stopWatchingCommands(): void {
    this.unwatchCommands?.();
    this.unwatchCommands = undefined;
  }

  private requireReady(id: string): Draft {
    const draft = this.draft;
    if (draft?.id !== id || !draft.ready || draft.acp.connectionClosed) {
      throw new Error("Agent session closed. Reopen the modal to load its choices again.");
    }
    if (draft.updating) throw new Error("Wait for the agent to update its choices");
    return draft;
  }
}
