import type { GitFilePatch } from "../../../shared/gitDiff";

const patches = new Map<string, GitFilePatch>();
const MAX_ENTRIES = 24;

/** Reuse recently opened patches so returning to a review restores its scroll before painting. */
export const gitPatchCache = {
  get(key: string): GitFilePatch | undefined {
    const patch = patches.get(key);
    if (patch) { patches.delete(key); patches.set(key, patch); }
    return patch;
  },
  set(key: string, patch: GitFilePatch): void {
    patches.delete(key);
    patches.set(key, patch);
    while (patches.size > MAX_ENTRIES) patches.delete(patches.keys().next().value!);
  },
};
