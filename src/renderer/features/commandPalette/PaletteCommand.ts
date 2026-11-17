export interface PaletteCommand {
  id: string;
  label: string;
  aliases?: string;
  shortcut?: string;
  /** Why this command cannot run in the current context. */
  disabled?: string;
  run: () => unknown;
}
