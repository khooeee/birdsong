import { useCallback, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { sessionMatchesFilter } from "../../../shared/tabNav/sessionMatchesFilter";
import { flatRailSessions } from "./flatRailSessions";
import { PlusIcon } from "./PlusIcon";
import { SessionRailFilter } from "./SessionRailFilter";
import { SessionRailMenu } from "./SessionRailMenu";
import { SessionRailRow } from "./SessionRailRow";
import { useScrollActiveRailSession } from "./useScrollActiveRailSession";
import { useSessionRailMenus } from "./useSessionRailMenus";

export interface SessionListProps {
  pinned: Session[];
  unpinned: Session[];
  activeTabId: ActiveTabId;
  filter: string;
  onFilter: (value: string) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onCloseSession: (id: string) => void;
  onStop: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onFork: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
}

/** New Session, filter, and the pinned/unpinned session rows with their context menu. */
export function SessionList({
  pinned,
  unpinned,
  activeTabId,
  filter,
  onFilter,
  onSelect,
  onAdd,
  onCloseSession,
  onStop,
  onRenameSession,
  onFork,
  onPin,
  onUnpin,
}: SessionListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const allSessions = useMemo(() => flatRailSessions(pinned, unpinned), [pinned, unpinned]);
  const home = useMemo(
    () => pinned.find((session) => session.home) ?? unpinned.find((session) => session.home),
    [pinned, unpinned],
  );
  const filteredPinned = useMemo(
    () => pinned.filter((session) => !session.home && sessionMatchesFilter(session, filter)),
    [pinned, filter],
  );
  const filteredUnpinned = useMemo(
    () => unpinned.filter((session) => !session.home && sessionMatchesFilter(session, filter)),
    [unpinned, filter],
  );
  const filterActive = filter.trim().length > 0;
  const noMatches = filterActive && filteredPinned.length === 0 && filteredUnpinned.length === 0;

  const { menu, setMenu, rename, setRename, menuRef } = useSessionRailMenus(activeTabId, allSessions);
  // The rail's live copy, so Mark as Unread follows a turn that finishes while the menu is open.
  const menuSession = menu && (allSessions.find((session) => session.id === menu.session.id) ?? menu.session);
  useScrollActiveRailSession(scrollRef, activeTabId);

  const openSessionMenu = useCallback((e: ReactMouseEvent, s: Session, p: boolean) => {
    e.preventDefault();
    setMenu({ session: s, pinned: p, x: e.clientX, y: e.clientY });
  }, [setMenu]);

  const rowProps = (session: Session, isPinned: boolean) => ({
    session,
    isPinned,
    active: activeTabId === session.id,
    renaming: rename?.id === session.id,
    setRename,
    onSelect,
    onRenameSession,
    onPin,
    onUnpin,
    onOpenSessionMenu: openSessionMenu,
  });

  return (
    <div className="rail-session-list">
      <button type="button" className="rail-session rail-new-session" onClick={onAdd}>
        <PlusIcon />
        <span className="rail-label">New Session</span>
      </button>
      <SessionRailFilter value={filter} onChange={onFilter} />
      <div className="rail-sessions">
        {home ? (
          <div className="rail-home">
            <SessionRailRow {...rowProps(home, true)} />
          </div>
        ) : null}
        <div className="rail-scroll" ref={scrollRef}>
          {filteredPinned.map((session) => (
            <SessionRailRow key={session.id} {...rowProps(session, true)} />
          ))}
          {filteredPinned.length > 0 && filteredUnpinned.length > 0 && (
            <div className="rail-pin-divider" role="separator" aria-hidden="true" />
          )}
          {filteredUnpinned.map((session) => (
            <SessionRailRow key={session.id} {...rowProps(session, false)} />
          ))}
          {noMatches ? <div className="rail-filter-empty">No matching tabs</div> : null}
        </div>
        <div className="rail-fade" aria-hidden="true" />
      </div>
      {menu && menuSession &&
        createPortal(
          <SessionRailMenu
            menuRef={menuRef}
            session={menuSession}
            pinned={menu.pinned}
            x={menu.x}
            y={menu.y}
            onRename={setRename}
            onFork={onFork}
            onPin={onPin}
            onUnpin={onUnpin}
            onStop={onStop}
            onClose={onCloseSession}
            onDismiss={() => setMenu(null)}
          />,
          document.body,
        )}
    </div>
  );
}
