const sessionId = { type: "string", description: "Birdsong session id" };

function tool(name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) {
  return { name, description, inputSchema: { type: "object", properties, required } };
}

/** Tools every session gets from Birdsong's MCP server; `callBirdsongTool` runs them. */
export const BIRDSONG_TOOLS = [
  tool("list_working_folders", "List this session's working folders in Files view order, with their ids and resolved absolute paths."),
  tool(
    "add_working_folder",
    "Add a folder to this session's Files view after creating a git worktree or before working outside the listed roots. Relative paths resolve against the Session Folder; symlinks resolve to their targets. Duplicate paths return the existing entry in place. Does not create a directory or change your working directory. Returns the ordered list.",
    { path: { type: "string", description: "Existing directory; absolute or relative to the Session Folder" } },
    ["path"],
  ),
  tool(
    "remove_working_folder",
    "Remove a folder from this session's Files view when deleting its worktree or when it is no longer part of this session's work. Use its id from list_working_folders; works after deletion too. Does not delete files. Returns the ordered list.",
    { folderId: { type: "string" } },
    ["folderId"],
  ),
  tool(
    "list_sessions",
    "List the sessions in Birdsong's sidebar, pinned first, then newest. Returns up to `limit` of them and the total count.",
    { limit: { type: "number", description: "Default 20" } },
  ),
  tool(
    "create_session",
    "Start a new agent session in the background, optionally with a first prompt. Returns at once with the session; keep its id and track children by id, never by title.",
    {
      agent: { type: "string", enum: ["claude", "codex", "cursor", "pi"] },
      cwd: { type: "string", description: "Absolute workspace path" },
      title: { type: "string" },
      prompt: { type: "string", description: "First prompt; returns without waiting for the reply" },
    },
    ["agent", "cwd"],
  ),
  tool(
    "send_prompt",
    "Send a prompt to another session. Returns once it is accepted, without waiting for the reply; a busy session steers or queues it. Keep working and collect replies later with wait_for_sessions.",
    { sessionId, text: { type: "string" } },
    ["sessionId", "text"],
  ),
  tool(
    "wait_for_sessions",
    "Wait until the sessions finish their current turns, up to timeoutSeconds (at most 45), then report each one's status and, once finished, its latest reply. Call again for any still running.",
    {
      sessionIds: { type: "array", items: { type: "string" } },
      timeoutSeconds: { type: "number", description: "Default and maximum 45" },
    },
    ["sessionIds"],
  ),
  tool(
    "read_transcript",
    "Read a session's latest turns: each prompt and the final assistant reply.",
    { sessionId, last: { type: "number", description: "How many recent turns; default 1" } },
    ["sessionId"],
  ),
  tool(
    "update_session",
    "Rename, pin or unpin a session, including this one. Titles can be multiline, and URLs in them become links.",
    {
      sessionId: { ...sessionId, description: "Birdsong session id; defaults to this session" },
      title: { type: "string" },
      pinned: { type: "boolean", description: "Pin it at the top of the sidebar" },
    },
  ),
  tool(
    "set_reminder",
    "Remind the user at a time with a desktop notification, spoken too when voice is on; clicking it opens this session. It is for the user only: it never prompts any session, this one included. Give `at` or `inMinutes`. Returns the reminder with its due time in local time.",
    {
      message: { type: "string", description: "What to tell the user" },
      at: { type: "string", description: "ISO 8601 time, e.g. YYYY-MM-DDTHH:MM; without an offset it is the user's local time" },
      inMinutes: { type: "number", description: "Minutes from now" },
    },
    ["message"],
  ),
  tool("list_reminders", "List pending reminders from every session, soonest first, and the current local time."),
  tool("cancel_reminder", "Cancel a pending reminder by id.", { id: { type: "string" } }, ["id"]),
];
