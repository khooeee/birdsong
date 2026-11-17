interface Location {
  sessionId: string;
  path: string;
  line: number;
  column: number;
  length: number;
}

let pending: Location | null = null;
const listeners = new Set<() => void>();

/** A location to select once its file's CodeMirror view is ready. */
export const editorNavigation = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => pending,
  request(location: Location): void {
    pending = location;
    listeners.forEach((listener) => listener());
  },
  clear(location: Location): void {
    if (pending !== location) return;
    pending = null;
    listeners.forEach((listener) => listener());
  },
};
