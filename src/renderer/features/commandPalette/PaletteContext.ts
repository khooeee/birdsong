import type { RailMode } from "../../../shared/railMode";

export interface PaletteContext {
  mode: RailMode;
  hasSessions: boolean;
  hasSession: boolean;
  supportsFork: boolean;
  pinned: boolean;
  unread: boolean;
  zenMode: boolean;
  wordWrap: boolean;
  filesReady: boolean;
  hasFile: boolean;
  textFile: boolean;
}
