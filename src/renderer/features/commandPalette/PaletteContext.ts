import type { RailMode } from "../../../shared/railMode";

export interface PaletteContext {
  mode: RailMode;
  hasSessions: boolean;
  hasSession: boolean;
  supportsFork: boolean;
  pinned: boolean;
  /** The session on screen is Home, which stays pinned and open. */
  home: boolean;
  /** A Home folder is set, so Go to Home can open it. */
  homeOn: boolean;
  unread: boolean;
  zenMode: boolean;
  wordWrap: boolean;
  filesReady: boolean;
  hasFile: boolean;
  textFile: boolean;
}
