import type { RefObject } from "react";
import type { Session } from "../../../shared/session";
import { SAVE_MARKDOWN_VIEW_LABELS } from "../../../shared/saveMarkdownViewLabels";
import { sessionLink } from "../../../shared/sessionLink";
import "../settings/menus.css";
import "../settings/settingsShortcuts.css";
import { openSessionInEditor } from "../explorer/openSessionInEditor";
import { modLabel } from "../shortcuts/modLabel";
import { pinShortcut } from "./pinShortcut";
import { SessionRailMenuItem } from "./SessionRailMenuItem";
import { saveSessionMarkdown } from "./saveSessionMarkdown";
import { toggleSessionUnread } from "./toggleSessionUnread";

export function SessionRailMenu({
  menuRef,
  session,
  pinned,
  x,
  y,
  onRename,
  onFork,
  onPin,
  onUnpin,
  onStop,
  onClose,
  onDismiss,
}: {
  menuRef: RefObject<HTMLDivElement | null>;
  session: Session;
  pinned: boolean;
  x: number;
  y: number;
  onRename: (session: Session) => void;
  onFork: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onStop: (id: string) => void;
  onClose: (id: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div ref={menuRef} className="context-menu" role="menu" style={{ left: x, top: y }}>
      <SessionRailMenuItem
        label="Rename..."
        shortcut={modLabel("R")}
        keys="Meta+R Control+R"
        onSelect={() => onRename(session)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Open in Editor"
        disabled={!session.cwd.trim()}
        onSelect={() => void openSessionInEditor(session.id).catch(console.error)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Copy Link"
        onSelect={() => void navigator.clipboard.writeText(sessionLink(session.id)).catch(console.error)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label={session.unread ? "Mark as Read" : "Mark as Unread"}
        onSelect={() => toggleSessionUnread(session)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Fork"
        shortcut={modLabel("N", true)}
        keys="Meta+Shift+N Control+Shift+N"
        disabled={!session.supportsFork}
        onSelect={() => onFork(session.id)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label={pinned ? "Unpin" : "Pin"}
        shortcut={pinShortcut.label}
        keys={pinShortcut.keys}
        onSelect={() => (pinned ? onUnpin(session.id) : onPin(session.id))}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label={`${SAVE_MARKDOWN_VIEW_LABELS.session}...`}
        onSelect={() => void saveSessionMarkdown(session).catch(console.error)}
        onDismiss={onDismiss}
      />
      <div className="context-separator" role="separator" />
      <SessionRailMenuItem
        label="Stop"
        shortcut="Esc"
        keys="Escape"
        disabled={session.status !== "running"}
        onSelect={() => onStop(session.id)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Close"
        shortcut={modLabel("W")}
        keys="Meta+W"
        onSelect={() => onClose(session.id)}
        onDismiss={onDismiss}
      />
    </div>
  );
}
