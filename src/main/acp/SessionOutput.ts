import { randomUUID } from "node:crypto";
import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { AgentKind } from "../../shared/agentKind";
import type { TranscriptItem } from "../../shared/transcript";
import { stripCursorStreamNoise } from "../../shared/cursorStreamNoise";
import { ToolOutput } from "./ToolOutput";

export class SessionOutput {
  private streamingAssistantId: string | null = null;
  private streamingThoughtId: string | null = null;
  private tools: ToolOutput;

  constructor(
    private agent: AgentKind,
    cwd: string,
    private onTranscript: (item: TranscriptItem, replaceId?: string) => void,
  ) {
    this.tools = new ToolOutput(cwd, onTranscript);
  }

  finish(status: string): void {
    this.tools.finish(status);
  }

  reset(): void {
    this.streamingAssistantId = null;
    this.streamingThoughtId = null;
  }

  handleUpdate(update: acp.SessionUpdate): void {
    switch (update.sessionUpdate) {
      case "agent_message_chunk": {
        this.streamingThoughtId = null;
        const chunk = stripCursorStreamNoise(this.agent, contentText(update.content));
        if (!chunk) return;
        if (update.messageId && this.streamingAssistantId && update.messageId !== this.streamingAssistantId) {
          this.streamingAssistantId = null;
        }
        const replaceId = this.streamingAssistantId || undefined;
        this.streamingAssistantId ||= update.messageId ?? randomUUID();
        this.onTranscript({
          id: this.streamingAssistantId,
          role: "assistant",
          text: chunk,
          at: Date.now(),
        }, replaceId);
        break;
      }
      case "agent_thought_chunk": {
        this.streamingAssistantId = null;
        const chunk = contentText(update.content);
        if (!chunk) return;
        const replaceId = this.streamingThoughtId ?? undefined;
        this.streamingThoughtId ??= randomUUID();
        this.onTranscript({
          id: this.streamingThoughtId,
          role: "thought",
          text: chunk,
          at: Date.now(),
        }, replaceId);
        break;
      }
      case "tool_call":
      case "tool_call_update": {
        this.reset();
        this.tools.handle(update);
        break;
      }
      case "plan": {
        this.onTranscript({
          id: randomUUID(),
          role: "system",
          text: "Plan updated",
          at: Date.now(),
        });
        break;
      }
      default:
        break;
    }
  }
}

function contentText(content: acp.ContentBlock | undefined): string {
  if (!content) return "";
  if (content.type === "text") return content.text;
  return `[${content.type}]`;
}
