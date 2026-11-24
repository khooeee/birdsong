let name: string | null = null;
let names: string[] = [];
const listeners = new Set<() => void>();

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function set(next: string | null, nextNames?: string[]): void {
  const resolved = next === null ? [] : (nextNames ?? (names.includes(next) ? names : [next]));
  if (next === name && (resolved === names || sameList(resolved, names))) return;
  name = next;
  if (resolved !== names && !sameList(resolved, names)) names = resolved;
  listeners.forEach((listener) => listener());
}

/** Which stored transcript image is open in the center-column viewer. */
export const imageViewer = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): string | null {
    return name;
  },

  getNames(): string[] {
    return names;
  },

  open(next: string, siblings?: string[]): void {
    set(next, siblings);
  },

  next(): void {
    if (!name || names.length < 2) return;
    const index = names.indexOf(name);
    if (index < 0) return;
    set(names[(index + 1) % names.length], names);
  },

  prev(): void {
    if (!name || names.length < 2) return;
    const index = names.indexOf(name);
    if (index < 0) return;
    set(names[(index - 1 + names.length) % names.length], names);
  },

  close(): void {
    set(null);
  },
};
