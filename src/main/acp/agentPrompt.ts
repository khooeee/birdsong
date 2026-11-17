import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { SlashCommand } from "../../shared/session";
import { BIRDSONG_INSTRUCTIONS } from "../mcp/birdsongInstructions";

/** Attach app context at delivery time; the saved user message remains exactly as typed. */
export function agentPrompt(text: string, hasBirdsongTools: boolean, commands: readonly SlashCommand[]): acp.ContentBlock[] {
  const user: acp.ContentBlock = { type: "text", text };
  // Adapters parse native slash commands from a single text block.
  const command = /^\s*\/(\S+)/.exec(text)?.[1];
  const native = command !== undefined && commands.some((item) => item.name.replace(/^\//, "") === command);
  if (!hasBirdsongTools || native) return [user];
  // Some adapters inspect the first block for titles and other native prompt behavior.
  return [
    user,
    {
      type: "text",
      text: [
        "<birdsong_context>",
        BIRDSONG_INSTRUCTIONS,
        "Discover these tools on the birdsong MCP server. Register each worktree after creating it and before editing its files. These tools only update Files view.",
        "</birdsong_context>",
      ].join("\n"),
    },
  ];
}
