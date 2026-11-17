import type { PaletteCommand } from "./PaletteCommand";

export interface RankedCommand {
  command: PaletteCommand;
  positions: readonly number[];
}
