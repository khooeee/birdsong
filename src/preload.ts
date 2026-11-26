import { contextBridge, ipcRenderer } from "electron";
import type { CursorAskQuestionRequest } from "./shared/agentRequests";
import type { AppSettings } from "./shared/appSettings";
import type { CreateSessionInput } from "./shared/createSessionInput";
import type { FindInSessionsHit } from "./shared/findInSessionsHit";
import type { SessionListPayload, BirdsongApi } from "./shared/birdsongApi";
import type { SlashCommand } from "./shared/session";
import type { TranscriptTurn } from "./shared/transcript";
import type { VoiceCommand } from "./shared/voiceCommand";
import type { VoiceLogEntry } from "./shared/voiceLogEntry";
import type { VoiceStatus } from "./shared/voiceStatus";
import { applyInitialTheme } from "./preload/applyInitialTheme";

applyInitialTheme();

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: BirdsongApi = {
  availableAgents: () => ipcRenderer.invoke("agents:available"),
  startSessionDraft: (id, agent, cwd) => ipcRenderer.invoke("sessionDraft:start", id, agent, cwd),
  selectSessionDraftConfig: (id, category, value) => ipcRenderer.invoke("sessionDraft:select", id, category, value),
  discardSessionDraft: (id) => ipcRenderer.invoke("sessionDraft:discard", id),
  onSessionDraftCommands: (cb) =>
    subscribe<{ id: string; commands: SlashCommand[] }>("sessionDraft:commands", cb),
  createSession: (input: CreateSessionInput) => ipcRenderer.invoke("sessions:create", input),
  forkSession: (sessionId, eventId) =>
    ipcRenderer.invoke("sessions:fork", sessionId, eventId),
  continueSession: (sessionId, agent, pin) => ipcRenderer.invoke("sessions:continue", sessionId, agent, pin),
  closeSession: (sessionId: string) => ipcRenderer.invoke("sessions:close", sessionId),
  renameSession: (sessionId: string, title: string) =>
    ipcRenderer.invoke("sessions:rename", sessionId, title),
  pinSession: (sessionId: string) => ipcRenderer.invoke("sessions:pin", sessionId),
  unpinSession: (sessionId: string) => ipcRenderer.invoke("sessions:unpin", sessionId),
  setSessionUnread: (sessionId: string, unread: boolean) => ipcRenderer.invoke("sessions:setUnread", sessionId, unread),
  setActiveTab: (tabId: string) => ipcRenderer.invoke("sessions:setActive", tabId),
  openHome: () => ipcRenderer.invoke("home:open"),
  startFreshHome: () => ipcRenderer.invoke("home:startFresh"),
  checkHomeChange: (cwd, agent) => ipcRenderer.invoke("home:checkChange", cwd, agent),
  openSessionLink: (link) => ipcRenderer.invoke("sessions:openLink", link),
  sessionLinksReady: () => ipcRenderer.invoke("sessions:linksReady"),
  onNavigateToSession: (cb) => subscribe<{ sessionId: string }>("navigate-session", cb),
  listSessions: () => ipcRenderer.invoke("sessions:list"),
  sendPrompt: (sessionId: string, text: string) =>
    ipcRenderer.invoke("session:prompt", sessionId, text),
  cancelPrompt: (sessionId: string) => ipcRenderer.invoke("session:cancel", sessionId),
  respondAskQuestion: (requestId, outcome) =>
    ipcRenderer.invoke("session:askQuestion", requestId, outcome),
  pickFolder: (startPath?: string) => ipcRenderer.invoke("fs:pickFolder", startPath),
  confirmCreateFolder: (path: string) => ipcRenderer.invoke("fs:confirmCreateFolder", path),
  saveMarkdown: (text: string, nameHint?: string) =>
    ipcRenderer.invoke("fs:saveMarkdown", text, nameHint),
  openTranscriptsFolder: () => ipcRenderer.invoke("fs:openTranscriptsFolder"),
  getCrons: () => ipcRenderer.invoke("crons:get"),
  saveCrons: (crons, revision) => ipcRenderer.invoke("crons:save", crons, revision),
  listReminders: () => ipcRenderer.invoke("reminders:list"),
  saveReminder: (input) => ipcRenderer.invoke("reminders:save", input),
  cancelReminder: (id) => ipcRenderer.invoke("reminders:cancel", id),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke("settings:update", patch),
  getMcpServers: () => ipcRenderer.invoke("mcp:get"),
  checkMcpServers: (text) => ipcRenderer.invoke("mcp:check", text),
  saveMcpServers: (text) => ipcRenderer.invoke("mcp:save", text),
  getRemoteStatus: () => ipcRenderer.invoke("remote:status"),
  getApnsKeyInfo: () => ipcRenderer.invoke("apns:keyInfo"),
  pickApnsKey: () => ipcRenderer.invoke("apns:pickKey"),
  removeApnsKey: () => ipcRenderer.invoke("apns:removeKey"),
  rotateControlToken: () => ipcRenderer.invoke("control:rotateToken"),
  savePastedImage: (sessionId, image) =>
    ipcRenderer.invoke("images:savePaste", sessionId, image.mimeType, image.bytes),
  saveClipboardImage: (sessionId) => ipcRenderer.invoke("images:saveClipboard", sessionId),
  showEditContextMenu: (opts) => ipcRenderer.invoke("edit:contextMenu", opts),
  showComposerContextMenu: (opts) => ipcRenderer.invoke("composer:contextMenu", opts),
  showImageContextMenu: (name) => ipcRenderer.invoke("image:contextMenu", name),
  showConfigMenu: (sessionId, category) => ipcRenderer.invoke("session:configMenu", sessionId, category),
  addWorkingFolder: (sessionId, path) => ipcRenderer.invoke("folders:add", sessionId, path),
  replaceWorkingFolder: (sessionId, folderId, path) => ipcRenderer.invoke("folders:replace", sessionId, folderId, path),
  removeWorkingFolder: (sessionId, folderId) => ipcRenderer.invoke("folders:remove", sessionId, folderId),
  moveWorkingFolder: (sessionId, folderId, beforeId) => ipcRenderer.invoke("folders:move", sessionId, folderId, beforeId),
  resolveSessionPath: (sessionId, path) => ipcRenderer.invoke("files:resolve", sessionId, path),
  listSessionDir: (sessionId, relPath) => ipcRenderer.invoke("files:list", sessionId, relPath),
  listSessionFiles: (sessionId) => ipcRenderer.invoke("files:listAll", sessionId),
  findInFiles: (sessionId, query, matchCase) => ipcRenderer.invoke("files:search", sessionId, query, matchCase),
  stopFindInFiles: () => ipcRenderer.invoke("files:stopSearch"),
  getGithubRepoUrl: (sessionId) => ipcRenderer.invoke("git:githubRepo", sessionId),
  getGitDiff: (sessionId, scope) => ipcRenderer.invoke("git:diff", sessionId, scope),
  getGitPatch: (sessionId, root, path, oldPath, scope, fullContext) =>
    ipcRenderer.invoke("git:patch", sessionId, root, path, oldPath, scope, fullContext),
  pickSessionFile: (sessionId) => ipcRenderer.invoke("files:pick", sessionId),
  readSessionFile: (sessionId, relPath) => ipcRenderer.invoke("files:read", sessionId, relPath),
  writeSessionFile: (sessionId, relPath, text, baseMtimeMs) =>
    ipcRenderer.invoke("files:write", sessionId, relPath, text, baseMtimeMs),
  showFileContextMenu: (sessionId, relPath) => ipcRenderer.invoke("files:contextMenu", sessionId, relPath),
  renameSessionFile: (sessionId, relPath, name) => ipcRenderer.invoke("files:rename", sessionId, relPath, name),
  trashSessionFile: (sessionId, relPath, unsaved) => ipcRenderer.invoke("files:trash", sessionId, relPath, unsaved),
  pickSaveFile: (sessionId, suggested) => ipcRenderer.invoke("files:pickSave", sessionId, suggested),
  confirmUnsavedChanges: (names) => ipcRenderer.invoke("files:confirmUnsaved", names),
  watchSessionFiles: (sessionId) => ipcRenderer.invoke("files:watch", sessionId),
  unwatchSessionFiles: (sessionId) => ipcRenderer.invoke("files:unwatch", sessionId),
  onSessionFilesChanged: (cb) =>
    subscribe<{ sessionId: string; folderId: string; paths: string[] | null }>("files:changed", cb),
  getExplorerState: (sessionId) => ipcRenderer.invoke("files:getExplorer", sessionId),
  saveExplorerState: (sessionId, state) => ipcRenderer.invoke("files:saveExplorer", sessionId, state),
  onPrepareQuit: (cb) => subscribe<{ requestId: number }>("app:prepareQuit", cb),
  quitReady: (requestId, ok) => ipcRenderer.send("app:quitReady", requestId, ok),
  getTranscript: (sessionId: string) => ipcRenderer.invoke("transcript:get", sessionId),
  getSubagentTranscript: (sessionId: string, subagentId: string) =>
    ipcRenderer.invoke("subagent:transcript", sessionId, subagentId),
  findInSessions: (query: string, searchId: number) =>
    ipcRenderer.invoke("sessions:findInSessions", query, searchId) as Promise<{ searchId: number }>,
  stopFindInSessions: () => ipcRenderer.invoke("sessions:stopFindInSessions"),
  navigateToEvent: (sessionId: string, turnId: string, eventId: string) =>
    ipcRenderer.invoke("sessions:navigateEvent", sessionId, turnId, eventId),
  onSessionsChanged: (cb) =>
    subscribe<SessionListPayload>("sessions:changed", cb),
  onSessionRemoved: (cb) => subscribe<{ message: string }>("session:removed", cb),
  onTranscript: (cb) =>
    subscribe<{ sessionId: string; turn: TranscriptTurn }>("transcript", cb),
  onSubagentTurn: (cb) =>
    subscribe<{ sessionId: string; subagentId: string; turn: TranscriptTurn }>("subagent:turn", cb),
  onTranscriptReset: (cb) =>
    subscribe<{ sessionId: string; turns: TranscriptTurn[]; draft?: string }>("transcript:reset", cb),
  onQuestionSettled: (cb) => subscribe<{ requestId: string }>("question:settled", cb),
  onAskQuestion: (cb) => subscribe<CursorAskQuestionRequest>("ask-question", cb),
  onPromptComplete: (cb) => subscribe<{ sessionId: string; announced?: boolean }>("prompt:complete", cb),
  onReminderChime: (cb) => subscribe<void>("reminder:chime", cb),
  toggleVoice: () => ipcRenderer.invoke("voice:toggle"),
  getVoiceStatus: () => ipcRenderer.invoke("voice:status"),
  getVoiceKeyInfo: () => ipcRenderer.invoke("voice:keyInfo"),
  setVoiceKey: (key) => ipcRenderer.invoke("voice:setKey", key),
  listVoices: (refresh) => ipcRenderer.invoke("voice:voices", refresh),
  getVoicePreview: (voiceId) => ipcRenderer.invoke("voice:preview", voiceId),
  getVoiceLog: () => ipcRenderer.invoke("voice:log"),
  onVoiceLogEntry: (cb) => subscribe<VoiceLogEntry>("voice:log-entry", cb),
  voiceAnswer: (offerSdp) => ipcRenderer.invoke("voice:answer", offerSdp),
  voiceConnection: (event) => ipcRenderer.send("voice:connection", event),
  onVoiceCommand: (cb) => subscribe<VoiceCommand>("voice:command", cb),
  onVoiceStatus: (cb) => subscribe<VoiceStatus>("voice:status", cb),
  onNavigateToEvent: (cb) =>
    subscribe<{ sessionId: string; turnId: string; eventId: string }>("navigate-event", cb),
  onFindProgress: (cb) =>
    subscribe<{
      searchId: number;
      scanned: number;
      total: number;
      matchCount: number;
    }>("find:progress", cb),
  onFindChunk: (cb) =>
    subscribe<{ searchId: number; added: FindInSessionsHit[] }>("find:chunk", cb),
  onFindDone: (cb) =>
    subscribe<{ searchId: number; stopped: boolean }>("find:done", cb),
};

contextBridge.exposeInMainWorld("birdsong", api);

/** Menu IPC channel → window event the renderer listens for (payload, if any, becomes `detail`). */
const MENU_EVENTS: Record<string, string> = {
  "find:open": "birdsong:find",
  "find:open-scoped": "birdsong:find-scoped",
  "turn:details": "birdsong:turn-details",
  "markdown:save-view": "birdsong:save-view-markdown",
  "find-sessions:open": "birdsong:find-sessions",
  "settings:open": "birdsong:open-settings",
  "explorer:toggle": "birdsong:toggle-explorer",
  "editor:toggle-word-wrap": "birdsong:toggle-word-wrap",
  "menu:command": "birdsong:menu-command",
};

for (const [channel, eventName] of Object.entries(MENU_EVENTS)) {
  ipcRenderer.on(channel, (_event, detail?: unknown) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}
