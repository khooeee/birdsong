export interface PaletteTarget {
  sessionId: string | null;
  hasSessions: boolean;
  supportsFork: boolean;
  pinned: boolean;
  home: boolean;
  unread: boolean;
}
