import type { Session } from "../../../shared/session";

export function toggleSessionUnread(session: Session): void {
  void window.birdsong.setSessionUnread(session.id, !session.unread);
}
