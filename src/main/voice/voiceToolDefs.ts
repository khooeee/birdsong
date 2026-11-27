function tool(name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) {
  return { type: "function", name, description, parameters: { type: "object", properties, required } };
}

/** Function tools in `session.update`; names match runVoiceTool's handlers. Session tools act on this voice's session. */
export const voiceToolDefs = [
  tool("get_status", "The session's status, what it is doing now, its last result and any open question."),
  tool("read_turns", "The session's last few prompts and replies, when the user wants more than the last result.", {
    count: { type: "integer", description: "How many recent turns (1–10). Default 3." },
  }),
  tool(
    "send_prompt",
    "Send the user's instruction to the session's coding agent. Keep the user's words and intent; do not expand the task. Steers or queues if it is busy.",
    { text: { type: "string", description: "The instruction, close to what the user said." } },
    ["text"],
  ),
  tool("stop_session", "Stop the session's running turn. The session and its work stay."),
  tool("answer_question", "Answer the agent's open multiple-choice question with option ids from get_status or the notice.", {
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_id: { type: "string" },
          option_ids: { type: "array", items: { type: "string" } },
        },
        required: ["question_id", "option_ids"],
      },
    },
    skip: { type: "boolean", description: "True to skip the question instead." },
  }),
  tool(
    "web_search",
    "Search the web for current or very specific facts. Runs in the background; say a short filler, and the answer arrives as a notice.",
    {
      query: { type: "string" },
      depth: { type: "string", enum: ["quick", "deep"], description: "deep for hard questions or 'look into it'. Default quick." },
    },
    ["query"],
  ),
  tool(
    "set_reminder",
    "Remind the user at a time: a popup with a chime, or you read it out while voice is on this session. Set it yourself; never prompt the agent for it. Give minutes or at.",
    {
      message: { type: "string", description: "What to remind the user of, close to their words." },
      minutes: { type: "number", description: "Minutes from now." },
      at: { type: "string", description: "Local date and time as YYYY-MM-DDTHH:MM." },
    },
    ["message"],
  ),
  tool("list_reminders", "The session's pending reminders, soonest first, with the current time."),
  tool("cancel_reminder", "Cancel one of the session's pending reminders by its id from list_reminders.", { id: { type: "string" } }, ["id"]),
  tool("stop_voice", "Turn voice off when the user says to stop listening, go to sleep, or goodbye."),
];
