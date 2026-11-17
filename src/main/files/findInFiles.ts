import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FindInFilesResult } from "../../shared/findInFilesResult";
import type { WorkingFolder } from "../../shared/workingFolder";
import { listSessionFiles } from "./listSessionFiles";

const MAX_MATCHES = 1000;
const MAX_BYTES = 2 * 1024 * 1024;

/** Search the same files as Go to File, skipping binary, symlink and oversized files. */
export async function findInFiles(
  folders: WorkingFolder[], query: string, matchCase = false, signal?: AbortSignal,
): Promise<FindInFilesResult> {
  const result: FindInFilesResult = { files: [], matchCount: 0, truncated: false };
  if (!query || /[\r\n]/.test(query)) return result;
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");
  const seen = new Set<string>();
  for (const folder of folders) {
    if (signal?.aborted) return result;
    const paths = await listSessionFiles(folder.path);
    for (const relative of paths.sort()) {
      if (signal?.aborted) return result;
      const absolute = path.resolve(folder.path, relative);
      if (seen.has(absolute)) continue;
      seen.add(absolute);
      // Files may disappear or become unreadable while the search is running.
      const bytes = await (async () => {
        const stat = await fs.lstat(absolute);
        if (!stat.isFile() || stat.size > MAX_BYTES) return null;
        return fs.readFile(absolute);
      })().catch(() => null);
      if (signal?.aborted) return result;
      if (!bytes || bytes.length > MAX_BYTES || bytes.subarray(0, 8000).includes(0)) continue;
      const file: FindInFilesResult["files"][number] = {
        path: absolute.split(path.sep).join("/"),
        label: `${path.basename(folder.path)}/${relative}`,
        matches: [],
      };
      const lines = bytes.toString("utf8").split(/\r\n?|\n/);
      for (let line = 0; line < lines.length; line++) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(lines[line])) !== null) {
          if (result.matchCount === MAX_MATCHES) {
            result.truncated = true;
            return result;
          }
          if (!file.matches.length) result.files.push(file);
          const start = Math.max(0, match.index - 60);
          file.matches.push({
            line: line + 1, column: match.index + 1, length: match[0].length,
            preview: lines[line].slice(start, start + Math.max(240, match[0].length + 60)),
            previewColumn: match.index - start,
          });
          result.matchCount++;
        }
      }
    }
  }
  return result;
}
