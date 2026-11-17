/** Disk search results, with one-based lines and columns for editor navigation. */
export interface FindInFilesResult {
  files: Array<{
    path: string;
    label: string;
    matches: Array<{
      line: number;
      column: number;
      length: number;
      preview: string;
      previewColumn: number;
    }>;
  }>;
  matchCount: number;
  truncated: boolean;
}
