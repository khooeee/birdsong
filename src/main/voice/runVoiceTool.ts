import { errorMessage } from "../../shared/errorMessage";
import { answerQuestionTool } from "./tools/answerQuestionTool";
import { cancelReminderTool } from "./tools/cancelReminderTool";
import { getStatusTool } from "./tools/getStatusTool";
import { listRemindersTool } from "./tools/listRemindersTool";
import { readTurnsTool } from "./tools/readTurnsTool";
import { sendPromptTool } from "./tools/sendPromptTool";
import { setReminderTool } from "./tools/setReminderTool";
import { stopSessionTool } from "./tools/stopSessionTool";
import { stopVoiceTool } from "./tools/stopVoiceTool";
import { webSearchTool } from "./tools/webSearchTool";
import { toolArgs } from "./toolArgs";
import type { VoiceToolContext } from "./VoiceToolContext";

type Handler = (ctx: VoiceToolContext, args: Record<string, unknown>) => Promise<unknown>;

const HANDLERS: Record<string, Handler> = {
  get_status: getStatusTool,
  read_turns: readTurnsTool,
  send_prompt: sendPromptTool,
  stop_session: stopSessionTool,
  answer_question: answerQuestionTool,
  web_search: webSearchTool,
  set_reminder: setReminderTool,
  list_reminders: listRemindersTool,
  cancel_reminder: cancelReminderTool,
  stop_voice: stopVoiceTool,
};

/** Tools that change the session or reminders; refused unless the user's own speech triggered the response. */
const USER_ONLY = new Set(["send_prompt", "stop_session", "answer_question", "set_reminder", "cancel_reminder"]);

/** Run one tool call and return the `function_call_output` string, in full. */
export async function runVoiceTool(
  ctx: VoiceToolContext,
  name: string,
  rawArgs: string,
  trigger: "user" | "notice",
): Promise<string> {
  const handler = HANDLERS[name];
  let result: unknown;
  if (!handler) {
    result = { ok: false, error: `Unknown tool ${name}.` };
  } else if (trigger === "notice" && USER_ONLY.has(name)) {
    result = {
      ok: false,
      error: "Refused: a Birdsong notice triggered this response, not the user. Ask the user, and act only on their spoken answer.",
    };
  } else {
    try {
      result = await handler(ctx, toolArgs.parse(rawArgs));
    } catch (error) {
      result = { ok: false, error: errorMessage(error) };
    }
  }
  return JSON.stringify(result);
}
