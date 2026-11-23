import type { WorkingFolder } from "./workingFolder";
import type { GitDiffScope, GitDiffSnapshot, GitFilePatch } from "./gitDiff";
import type { ActiveTabId } from "./activeTabId";
import type { CursorAskQuestionRequest } from "./agentRequests";
import type { AgentKind } from "./agentKind";
import type { AppSettings } from "./appSettings";
import type { ConfigMenuCategory } from "./configMenuCategory";
import type { CreateSessionInput } from "./createSessionInput";
import type { CronInput } from "./cronInput";
import type { CronsSnapshot } from "./cronsSnapshot";
import type { DirListing } from "./dirListing";
import type { FindInFilesResult } from "./findInFilesResult";
import type { FindInSessionsHit } from "./findInSessionsHit";
import type { Reminder } from "./reminder";
import type { ReminderInput } from "./reminderInput";
import type { ApnsKeyInfo } from "./apnsKeyInfo";
import type { RemoteStatus } from "./remoteStatus";
import type { EditContextMenuOptions } from "./editContextMenuOptions";
import type { FileContent } from "./fileContent";
import type { FileMenuAction } from "./fileMenuAction";
import type { FileWriteResult } from "./fileWriteResult";
import type { InworldVoice } from "./inworldVoice";
import type { PersistedExplorer } from "./persistedExplorer";
import type { Session, SlashCommand } from "./session";
import type { SessionConfigSelect } from "./sessionConfigSelect";
import type { TranscriptTurn } from "./transcript";
import type { UnsavedChoice } from "./unsavedChoice";
import type { VoiceCommand } from "./voiceCommand";
import type { VoiceConnectionEvent } from "./voiceConnectionEvent";
import type { VoiceKeyInfo } from "./voiceKeyInfo";
import type { VoiceLogEntry } from "./voiceLogEntry";
import type { VoiceStatus } from "./voiceStatus";

export interface SessionListPayload {
  pinned: Session[];
  unpinned: Session[];
  activeTabId: ActiveTabId;
}

export interface BirdsongApi {
  /** Agents whose CLI and ACP adapter are installed. */
  availableAgents: () => Promise<AgentKind[]>;
  /** Null when `cwd` doesn't exist yet, so no agent starts there. */
  startSessionDraft: (id: string, agent: AgentKind, cwd: string) => Promise<SessionConfigSelect[] | null>;
  selectSessionDraftConfig: (id: string, category: ConfigMenuCategory, value: string) => Promise<SessionConfigSelect[]>;
  discardSessionDraft: (id: string) => Promise<void>;
  /** Slash commands for the new-session draft, including ones that arrive after it starts. */
  onSessionDraftCommands: (cb: (payload: { id: string; commands: SlashCommand[] }) => void) => () => void;
  createSession: (input: CreateSessionInput) => Promise<Session>;
  forkSession: (sessionId: string, eventId?: string) => Promise<Session>;
  closeSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  pinSession: (sessionId: string) => Promise<void>;
  unpinSession: (sessionId: string) => Promise<void>;
  setActiveTab: (tabId: string) => Promise<void>;
  openSessionLink: (link: string) => Promise<void>;
  sessionLinksReady: () => Promise<void>;
  onNavigateToSession: (cb: (payload: { sessionId: string }) => void) => () => void;
  listSessions: () => Promise<SessionListPayload>;
  sendPrompt: (sessionId: string, text: string) => Promise<void>;
  cancelPrompt: (sessionId: string) => Promise<void>;
  respondAskQuestion: (
    requestId: string,
    outcome:
      | {
          outcome: "answered";
          answers: Array<{ questionId: string; selectedOptionIds: string[] }>;
        }
      | { outcome: "skipped"; reason?: string }
      | { outcome: "cancelled" },
  ) => Promise<void>;
  pickFolder: (startPath?: string) => Promise<string | null>;
  /** Ask to create `path` when it doesn't exist; false when the user declines. */
  confirmCreateFolder: (path: string) => Promise<boolean>;
  /** Save-as dialog that writes `text` to a `.md` file named from `nameHint` (else `text`); false when cancelled. */
  saveMarkdown: (text: string, nameHint?: string) => Promise<boolean>;
  openTranscriptsFolder: () => Promise<void>;
  getCrons: () => Promise<CronsSnapshot>;
  saveCrons: (crons: CronInput[], revision: string) => Promise<CronsSnapshot>;
  listReminders: () => Promise<{ reminders: Reminder[]; errors: string[] }>;
  saveReminder: (input: ReminderInput) => Promise<Reminder>;
  cancelReminder: (id: string) => Promise<Reminder | undefined>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  /** iOS remote access: the pairing link and `tailscale serve` setup. */
  getRemoteStatus: () => Promise<RemoteStatus>;
  /** Saved APNs key state (the key itself never leaves main). */
  getApnsKeyInfo: () => Promise<ApnsKeyInfo>;
  /** Pick a .p8 and import it into encrypted app storage. */
  pickApnsKey: () => Promise<ApnsKeyInfo>;
  /** Delete the saved APNs key. */
  removeApnsKey: () => Promise<ApnsKeyInfo>;
  /** New token for the iOS app (control.json scripts keep theirs); returns the status with the new link. */
  rotateControlToken: () => Promise<RemoteStatus>;
  /**
   * Save a pasted image to a temp file and return its path.
   * `sessionId` is null in the new-session prompt, which has no session yet.
   */
  savePastedImage: (
    sessionId: string | null,
    image: { mimeType: string; bytes: Uint8Array },
  ) => Promise<string>;
  saveClipboardImage: (sessionId: string | null) => Promise<string | null>;
  /** Popup native Copy (+ Copy Link / Copy Code / Copy Message / Save Message as Markdown / Find / Turn Details / Save <view> as Markdown) at the cursor. */
  showEditContextMenu: (opts?: EditContextMenuOptions) => Promise<void>;
  /** Native Copy / Save… menu for a stored transcript image. */
  showImageContextMenu: (name: string) => Promise<void>;
  /** Popup Cut / Copy / Paste for the composer. */
  showComposerContextMenu: (opts?: {
    canCut?: boolean;
    canCopy?: boolean;
    canSelectAll?: boolean;
  }) => Promise<void>;
  /** Popup the session's model or effort picker; choosing a value sets it on the agent. */
  showConfigMenu: (sessionId: string, category: ConfigMenuCategory) => Promise<void>;
  addWorkingFolder: (sessionId: string, path: string) => Promise<WorkingFolder[]>;
  replaceWorkingFolder: (sessionId: string, folderId: string, path: string) => Promise<WorkingFolder[]>;
  removeWorkingFolder: (sessionId: string, folderId: string) => Promise<WorkingFolder[]>;
  moveWorkingFolder: (sessionId: string, folderId: string, beforeId?: string) => Promise<WorkingFolder[]>;
  /** Absolute editor path; relative input resolves against the Session Folder. */
  resolveSessionPath: (sessionId: string, path: string) => Promise<string>;
  /** Children of an absolute directory inside a registered working folder. */
  listSessionDir: (sessionId: string, relPath: string) => Promise<DirListing>;
  /** Absolute file paths across working folders for Go to File: git's tracked and unignored files in a repo, else a capped folder walk. */
  listSessionFiles: (sessionId: string) => Promise<string[]>;
  findInFiles: (sessionId: string, query: string, matchCase: boolean) => Promise<FindInFilesResult>;
  stopFindInFiles: () => Promise<void>;
  /** GitHub repository page for the Session Folder, or null when unavailable. */
  getGithubRepoUrl: (sessionId: string) => Promise<string | null>;
  getGitDiff: (sessionId: string, scope: GitDiffScope) => Promise<GitDiffSnapshot>;
  getGitPatch: (sessionId: string, root: string, path: string, oldPath: string | undefined,
    scope: GitDiffScope, fullContext: boolean) => Promise<GitFilePatch>;
  /** Native Open File dialog; returns an absolute path, null when cancelled. */
  pickSessionFile: (sessionId: string) => Promise<string | null>;
  /** Editor paths are absolute; legacy relative input still resolves against cwd. */
  readSessionFile: (sessionId: string, relPath: string) => Promise<FileContent>;
  /** Save editor text; `baseMtimeMs` null overwrites even when the file changed on disk. */
  writeSessionFile: (
    sessionId: string,
    relPath: string,
    text: string,
    baseMtimeMs: number | null,
  ) => Promise<FileWriteResult>;
  /** Popup Rename / Delete / Copy Path / Copy Relative Path for a file tree row; resolves a Rename / Delete pick, else null. */
  showFileContextMenu: (sessionId: string, relPath: string) => Promise<FileMenuAction | null>;
  /** Rename a file or folder under a working folder, keeping it in its folder. */
  renameSessionFile: (sessionId: string, relPath: string, name: string) => Promise<void>;
  /** Confirm, then move a file or folder under a working folder to the Trash; false when cancelled. */
  trashSessionFile: (sessionId: string, relPath: string, unsaved: boolean) => Promise<boolean>;
  /** Native Save As dialog, starting at editor path (or bare name) `suggested`: the chosen editor path, or null when cancelled. */
  pickSaveFile: (sessionId: string, suggested: string) => Promise<string | null>;
  /** Native Save / Don't Save / Cancel for files with unsaved edits. */
  confirmUnsavedChanges: (names: string[]) => Promise<UnsavedChoice>;
  /** Watch the session working folders while its explorer is shown; changes arrive on `onSessionFilesChanged`. */
  watchSessionFiles: (sessionId: string) => Promise<void>;
  unwatchSessionFiles: (sessionId: string) => Promise<void>;
  /** Absolute paths that changed under a watched root; null means too many to list. */
  onSessionFilesChanged: (cb: (payload: { sessionId: string; folderId: string; paths: string[] | null }) => void) => () => void;
  /** The session's saved file explorer (tree, tabs, scroll), or null for a fresh one. */
  getExplorerState: (sessionId: string) => Promise<PersistedExplorer | null>;
  saveExplorerState: (sessionId: string, state: PersistedExplorer) => Promise<void>;
  /** Main is about to quit: settle unsaved files, then answer with `quitReady` (false cancels). */
  onPrepareQuit: (cb: (payload: { requestId: number }) => void) => () => void;
  quitReady: (requestId: number, ok: boolean) => void;
  getTranscript: (sessionId: string) => Promise<TranscriptTurn[]>;
  getSubagentTranscript: (sessionId: string, subagentId: string) => Promise<TranscriptTurn[]>;
  findInSessions: (query: string, searchId: number) => Promise<{ searchId: number }>;
  stopFindInSessions: () => Promise<void>;
  onFindProgress: (
    cb: (payload: {
      searchId: number;
      scanned: number;
      total: number;
      matchCount: number;
    }) => void,
  ) => () => void;
  onFindChunk: (
    cb: (payload: { searchId: number; added: FindInSessionsHit[] }) => void,
  ) => () => void;
  onFindDone: (
    cb: (payload: { searchId: number; stopped: boolean }) => void,
  ) => () => void;
  onSessionsChanged: (cb: (payload: SessionListPayload) => void) => () => void;
  onSessionRemoved: (cb: (payload: { message: string }) => void) => () => void;
  onTranscript: (
    cb: (payload: { sessionId: string; turn: TranscriptTurn }) => void,
  ) => () => void;
  onSubagentTurn: (
    cb: (payload: { sessionId: string; subagentId: string; turn: TranscriptTurn }) => void,
  ) => () => void;
  /** `draft` seeds the composer (fork on a user message). */
  onTranscriptReset: (
    cb: (payload: { sessionId: string; turns: TranscriptTurn[]; draft?: string }) => void,
  ) => () => void;
  onQuestionSettled: (cb: (payload: { requestId: string }) => void) => () => void;
  onAskQuestion: (cb: (req: CursorAskQuestionRequest) => void) => () => void;
  /** `announced`: the voice agent will speak about it, so skip the completion sound. */
  onPromptComplete: (cb: (payload: { sessionId: string; announced?: boolean }) => void) => () => void;
  /** A reminder is due and the voice agent won't read it out. */
  onReminderChime: (cb: () => void) => () => void;
  /** Voice button / shortcut: start or stop. */
  toggleVoice: () => Promise<void>;
  getVoiceStatus: () => Promise<VoiceStatus>;
  getVoiceKeyInfo: () => Promise<VoiceKeyInfo>;
  /** Save the Inworld API key (encrypted in main); empty removes it. */
  setVoiceKey: (key: string) => Promise<void>;
  /** Voices the saved key's Inworld workspace can use, cached in main until `refresh` or a new key. */
  listVoices: (refresh?: boolean) => Promise<InworldVoice[]>;
  /** Inworld's MP3 sample of a voice, cached in main. */
  getVoicePreview: (voiceId: string) => Promise<Uint8Array>;
  /** The newest few hundred voice log entries (across days), oldest first. */
  getVoiceLog: () => Promise<VoiceLogEntry[]>;
  /** Each voice log entry as it is written. */
  onVoiceLogEntry: (cb: (entry: VoiceLogEntry) => void) => () => void;
  /** Exchange the WebRTC SDP offer for Inworld's answer (main holds the key). */
  voiceAnswer: (offerSdp: string) => Promise<string>;
  voiceConnection: (event: VoiceConnectionEvent) => void;
  onVoiceCommand: (cb: (command: VoiceCommand) => void) => () => void;
  onVoiceStatus: (cb: (status: VoiceStatus) => void) => () => void;
  onNavigateToEvent: (cb: (payload: { sessionId: string; turnId: string; eventId: string }) => void) => () => void;
  navigateToEvent: (sessionId: string, turnId: string, eventId: string) => Promise<void>;
}

declare global {
  interface Window {
    birdsong: BirdsongApi;
  }
}
