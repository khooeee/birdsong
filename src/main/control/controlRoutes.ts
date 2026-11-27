import * as fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../sessions/SessionManager";
import { controlCatalogJson } from "./controlCatalogJson";
import { applyTranscriptQuery } from "./transcriptQuery";
import { parseCreateSession } from "./parseCreateSession";
import { readJson } from "./readJson";
import { isMissingFolder } from "../files/isMissingFolder";
import { sendJson } from "./sendJson";
import { errorMessage } from "../../shared/errorMessage";
import { AGENT_KINDS, isAgentKind } from "../../shared/agentKind";
import { orList } from "../../shared/orList";
import { availableAgents } from "../acp/availableAgents";
import { continueSession } from "../sessions/continueSession";

/** Route one control API HTTP request to SessionManager; `authorized` says its bearer token was accepted. */
export async function handleControlRequest(
  req: IncomingMessage,
  res: ServerResponse,
  authorized: boolean,
  baseUrl: string,
  sessions: SessionManager,
): Promise<void> {
  try {
    const url = new URL(req.url ?? "/", baseUrl);
    const method = (req.method ?? "GET").toUpperCase();
    const pathname = url.pathname.replace(/\/$/, "") || "/";

    if (method === "GET" && pathname === "/") {
      return sendJson(res, 200, controlCatalogJson(baseUrl, "Use token from control.json; it changes every launch, so re-read it on a 401. Never commit it."));
    }

    if (!authorized) return sendJson(res, 401, { error: "Unauthorized" });

    if (method === "GET" && pathname === "/sessions") {
      return sendJson(res, 200, sessions.list());
    }

    if (method === "GET" && pathname === "/agents") {
      return sendJson(res, 200, await availableAgents());
    }

    if (method === "GET" && pathname === "/recent-folders") {
      return sendJson(res, 200, sessions.recentFolders());
    }

    if (method === "POST" && pathname === "/sessions") {
      const body = await readJson(req);
      const input = parseCreateSession(body);
      // 409 lets the phone ask before creating the folder, then retry with createFolder.
      if (await isMissingFolder(input.cwd)) {
        if (body.createFolder !== true) return sendJson(res, 409, { error: `Folder does not exist: ${input.cwd}` });
        await fs.mkdir(input.cwd, { recursive: true });
      }
      // Agents create children in the background; keep the user's current view.
      const session = await sessions.createSession(input, { focus: false });
      return sendJson(res, 200, session);
    }

    const sessionMatch =
      /^\/sessions\/([^/]+)(?:\/(prompt|cancel|close|transcript|rename|pin|unpin|read|unread|fork|config|continue))?$/.exec(pathname);
    if (!sessionMatch) return sendJson(res, 404, { error: "Not found" });
    const sessionId = decodeURIComponent(sessionMatch[1]!);
    const action = sessionMatch[2];

    if (method === "GET" && !action) {
      const session = sessions.getSessionPayload(sessionId);
      if (!session) return sendJson(res, 404, { error: "Session not found" });
      return sendJson(res, 200, session);
    }
    if (method === "GET" && action === "transcript") {
      const turns = await sessions.getTranscript(sessionId);
      return sendJson(res, 200, { sessionId, turns: applyTranscriptQuery(turns, url.searchParams) });
    }
    if (method === "POST" && action === "prompt") {
      const body = await readJson(req);
      const text = typeof body.text === "string" ? body.text : "";
      if (!text.trim()) return sendJson(res, 400, { error: "text is required" });
      const turnId = await sessions.enqueuePrompt(sessionId, text);
      return sendJson(res, 200, { sessionId, turnId, ok: true });
    }
    if (method === "POST" && action === "rename") {
      const body = await readJson(req);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return sendJson(res, 400, { error: "title is required" });
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      sessions.renameSession(sessionId, title);
      return sendJson(res, 200, { sessionId, title, ok: true });
    }
    if (method === "GET" && action === "config") {
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      return sendJson(res, 200, await sessions.getConfigPickers(sessionId));
    }
    if (method === "POST" && action === "config") {
      const body = await readJson(req);
      const { configId, value } = body;
      if (typeof configId !== "string" || typeof value !== "string") {
        return sendJson(res, 400, { error: "configId and value are required" });
      }
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      return sendJson(res, 200, await sessions.setConfigOption(sessionId, configId, value));
    }
    if (method === "POST" && action === "continue") {
      const body = await readJson(req);
      if (!isAgentKind(body.agent)) return sendJson(res, 400, { error: `agent must be ${orList(AGENT_KINDS)}` });
      // Like POST /sessions, keep the user's current view on the Mac.
      const session = await continueSession(sessions, sessionId, body.agent, { pin: body.pin === true, focus: false });
      return sendJson(res, 200, session);
    }
    if (method === "POST" && action === "pin") {
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      sessions.pinSession(sessionId);
      return sendJson(res, 200, { sessionId, pinned: true, ok: true });
    }
    if (method === "POST" && action === "unpin") {
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      sessions.unpinSession(sessionId);
      return sendJson(res, 200, { sessionId, pinned: false, ok: true });
    }
    if (method === "POST" && (action === "read" || action === "unread")) {
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      const unread = action === "unread";
      sessions.setSessionUnread(sessionId, unread);
      return sendJson(res, 200, { sessionId, unread, ok: true });
    }
    if (method === "POST" && action === "fork") {
      // Like POST /sessions, keep the user's current view on the Mac.
      return sendJson(res, 200, await sessions.forkSession(sessionId, undefined, { focus: false }));
    }
    if (method === "POST" && action === "cancel") {
      await sessions.cancelPrompt(sessionId);
      return sendJson(res, 200, { sessionId, ok: true });
    }
    if (method === "POST" && action === "close") {
      await sessions.closeSession(sessionId);
      return sendJson(res, 200, { sessionId, ok: true });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    const msg = errorMessage(err);
    const status = /not found|no session/i.test(msg) ? 404 : 400;
    return sendJson(res, status, { error: msg });
  }
}
