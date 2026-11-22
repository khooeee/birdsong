import { clipText } from "../../shared/clipText";
import { appendVoiceLog } from "./appendVoiceLog";
import type { CurrentVoiceCall } from "./CurrentVoiceCall";
import { runVoiceTool } from "./runVoiceTool";
import type { VoiceToolContext } from "./VoiceToolContext";

/** Run the tool a realtime event calls and send its output back, unless a reconnect replaced the call meanwhile. */
export async function answerToolCall(
  event: Record<string, unknown>,
  calls: CurrentVoiceCall,
  tools: VoiceToolContext,
  trigger: "user" | "notice",
): Promise<void> {
  const callId = String(event.call_id ?? "");
  const name = String(event.name ?? "");
  const args = String(event.arguments ?? "");
  if (!callId) return;
  const call = calls.current;
  const output = await runVoiceTool(tools, name, args, trigger);
  appendVoiceLog("tool", { name, args: clipText(args, 500), trigger, output: clipText(output, 800) });
  // A new call after a reconnect never asked for this output.
  if (!call || call !== calls.current) return;
  call.send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output } });
}
