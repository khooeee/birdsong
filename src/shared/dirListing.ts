import type { DirEntry } from "./dirEntry";

/** A loaded folder, or why it could not be read. */
export type DirListing = { entries: DirEntry[] } | { error: string; missing?: boolean };
