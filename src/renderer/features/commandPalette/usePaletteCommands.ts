import { useMemo, useSyncExternalStore } from "react";
import { useFileBuffer } from "../editor/useFileBuffer";
import { useExplorerRestored } from "../explorer/useExplorerRestored";
import { useExplorerState } from "../explorer/useExplorerState";
import { useRailMode } from "../explorer/useRailMode";
import { getAppSettingsCache, subscribeAppSettings } from "../settings/appSettingsCache";
import { sessionUnreadStore } from "../sessions/sessionUnreadStore";
import { paletteCommands } from "./paletteCommands";
import type { PaletteTarget } from "./PaletteTarget";

/** Subscribe only while the palette is open; transcript streaming never rebuilds the commands. */
export function usePaletteCommands({ sessionId, hasSessions, supportsFork, pinned }: PaletteTarget) {
  const mode = useRailMode();
  const { activeFile } = useExplorerState(sessionId ?? "");
  const filesReady = useExplorerRestored(mode === "files" ? sessionId : null);
  const buffer = useFileBuffer(sessionId ?? "", activeFile ?? "");
  const textFile = buffer?.kind === "text";
  const unreadIds = useSyncExternalStore(sessionUnreadStore.subscribe, sessionUnreadStore.getSnapshot);
  const unread = sessionId !== null && unreadIds.has(sessionId);
  const { zenMode, editorWordWrap: wordWrap } = useSyncExternalStore(subscribeAppSettings, getAppSettingsCache);

  return useMemo(() => paletteCommands({
    mode, hasSessions, hasSession: sessionId !== null, supportsFork, pinned, unread,
    zenMode, wordWrap, filesReady, hasFile: activeFile !== null, textFile,
  }), [mode, hasSessions, sessionId, supportsFork, pinned, unread, zenMode, wordWrap, filesReady, activeFile, textFile]);
}
