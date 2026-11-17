export function diffFileId(root: string, path: string): string {
  return `diff-${encodeURIComponent(root)}-${encodeURIComponent(path)}`;
}
