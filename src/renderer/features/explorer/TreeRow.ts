/** One visible line of the file tree. */
export interface TreeRow {
  /** Identifies this appearance of a path within a root, including root headers. */
  id: string;
  path: string;
  rootId?: string;
  folderId: string;
  name: string;
  kind: "file" | "dir";
  depth: number;
  expanded: boolean;
  /** Why an expanded folder could not be read. */
  error?: string;
  missing?: boolean;
}
