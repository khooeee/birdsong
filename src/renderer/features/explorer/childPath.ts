/** Join an entry name to its folder, preserving an absolute root slash. */
export function childPath(dir: string, name: string): string {
  return dir ? `${dir.replace(/\/$/, "")}/${name}` : name;
}
