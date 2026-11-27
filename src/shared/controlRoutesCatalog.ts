import { AGENT_KINDS } from "./agentKind";

interface CatalogRoute {
  method: string;
  path: string;
  auth: boolean;
  summary: string;
  body?: Record<string, string>;
  query?: Record<string, string>;
  /** A named shape from `types`, or field → description. */
  response: string | Record<string, string>;
  example: string;
}

/** Single source for the GET / route catalog. */
export function controlRoutesCatalog(baseUrl: string): CatalogRoute[] {
  const b = baseUrl.replace(/\/$/, "");
  return [
    {
      method: "GET",
      path: "/",
      auth: false,
      summary: "JSON catalog of routes",
      response: "This catalog: { name, baseUrl, auth, errors, types, routes }",
      example: `curl -s ${b}/`,
    },
    {
      method: "GET",
      path: "/sessions",
      auth: true,
      summary: "List sessions and active session id (check status while children run)",
      response: {
        pinned: "Session[]",
        unpinned: "Session[]",
        activeTabId: "string | null — focused session id",
      },
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/sessions`,
    },
    {
      method: "GET",
      path: "/agents",
      auth: true,
      summary: "Agents installed on this Mac, which POST /sessions and /sessions/:id/continue can start",
      response: `string[] — some of ${AGENT_KINDS.join(" | ")}`,
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/agents`,
    },
    {
      method: "GET",
      path: "/recent-folders",
      auth: true,
      summary: "Session Folders to suggest for POST /sessions: recent picks first, then rail sessions' folders",
      response: "string[] — absolute paths, most recent first, at most 10",
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/recent-folders`,
    },
    {
      method: "POST",
      path: "/sessions",
      auth: true,
      summary: "Create a session",
      body: {
        agent: AGENT_KINDS.join(" | "),
        cwd: "absolute workspace path",
        title: "optional string",
        pin: "optional boolean — pin the session at the top of the rail",
        createFolder: "optional boolean — create cwd if it doesn't exist; otherwise a missing cwd is a 409",
      },
      response: "Session",
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"agent":"cursor","cwd":"/path","title":"A"}' ${b}/sessions`,
    },
    {
      method: "GET",
      path: "/sessions/:id",
      auth: true,
      summary: "Get one session (check a child's status without listing all sessions)",
      response: "Session",
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>`,
    },
    {
      method: "POST",
      path: "/sessions/:id/prompt",
      auth: true,
      summary: "Enqueue a prompt; returns { turnId } immediately (does not wait for the turn)",
      body: { text: "prompt string" },
      response: {
        sessionId: "string",
        turnId: "string — TranscriptTurn.id (the in-flight turn when the prompt steers into it)",
        ok: "true",
      },
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"text":"hello"}' ${b}/sessions/<id>/prompt`,
    },
    {
      method: "POST",
      path: "/sessions/:id/continue",
      auth: true,
      summary: "Hand the session's work to another agent: a new session in its folders, prompted to read its transcript and carry on",
      body: {
        agent: AGENT_KINDS.join(" | "),
        pin: "optional boolean — pin the new session at the top of the rail",
      },
      response: "Session — the new session",
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"agent":"codex"}' ${b}/sessions/<id>/continue`,
    },
    {
      method: "POST",
      path: "/sessions/:id/fork",
      auth: true,
      summary: "Fork the session: a new rail entry with the same agent, folders and history, pinned if the source is",
      response: "Session — the fork; status is \"error\" when the agent can't fork",
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/fork`,
    },
    {
      method: "POST",
      path: "/sessions/:id/rename",
      auth: true,
      summary: "Rename a session",
      body: { title: "new title string" },
      response: { sessionId: "string", title: "string", ok: "true" },
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"title":"My session"}' ${b}/sessions/<id>/rename`,
    },
    {
      method: "GET",
      path: "/sessions/:id/config",
      auth: true,
      summary: "Model, effort and per-model setting choices (connects the session's agent if needed)",
      response: "ConfigPickers",
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/config`,
    },
    {
      method: "POST",
      path: "/sessions/:id/config",
      auth: true,
      summary: "Pick a model, effort or per-model setting; a new model can change the efforts on offer",
      body: { configId: "ConfigOption.id", value: "one of that option's choice values" },
      response: "ConfigPickers — the updated choices",
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"configId":"model","value":"<value>"}' ${b}/sessions/<id>/config`,
    },
    {
      method: "POST",
      path: "/sessions/:id/pin",
      auth: true,
      summary: "Pin a session to the top of the rail",
      response: { sessionId: "string", pinned: "true", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/pin`,
    },
    {
      method: "POST",
      path: "/sessions/:id/unpin",
      auth: true,
      summary: "Unpin a session",
      response: { sessionId: "string", pinned: "false", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/unpin`,
    },
    {
      method: "POST",
      path: "/sessions/:id/read",
      auth: true,
      summary: "Clear a session's unread dot, as opening it does",
      response: { sessionId: "string", unread: "false", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/read`,
    },
    {
      method: "POST",
      path: "/sessions/:id/unread",
      auth: true,
      summary: "Show a session's unread dot again",
      response: { sessionId: "string", unread: "true", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/unread`,
    },
    {
      method: "POST",
      path: "/sessions/:id/cancel",
      auth: true,
      summary: "Cancel the running prompt",
      response: { sessionId: "string", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/cancel`,
    },
    {
      method: "POST",
      path: "/sessions/:id/close",
      auth: true,
      summary: "Close the session (keeps history; does not delete)",
      response: { sessionId: "string", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/close`,
    },
    {
      method: "GET",
      path: "/sessions/:id/transcript",
      auth: true,
      summary: "Get the session transcript",
      query: { last: "optional — return only the newest N turns (e.g. last=1)" },
      response: { sessionId: "string", turns: "TranscriptTurn[] — oldest first" },
      example: `curl -s -H "Authorization: Bearer $TOKEN" "${b}/sessions/<id>/transcript?last=1"`,
    },
  ];
}
