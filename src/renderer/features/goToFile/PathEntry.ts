/** One file or folder offered by Go to File. */
export interface PathEntry {
  /** Absolute, "/"-separated. */
  path: string;
  kind: "file" | "dir";
  /** `path` as shown and matched: relative to its working folder (see pathLabel). */
  label: string;
  /** `label` lowercased for matching, the same length so offsets line up. */
  lower: string;
  /** Where the name (last segment) starts in `label`. */
  nameStart: number;
}
