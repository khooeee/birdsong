import type { Session } from "../../../shared/session";
import { isSameJson } from "./isSameJson";
import { shareById } from "./shareById";

/** Session status updates keep unchanged root objects and their list stable for memoized rows. */
export function shareSession(previous: Session, next: Session): Session {
  if (isSameJson(previous, next)) return previous;
  return { ...next, workingFolders: shareById(previous.workingFolders, next.workingFolders) };
}
