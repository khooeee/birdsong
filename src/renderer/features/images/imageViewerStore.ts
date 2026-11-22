let name: string | null = null;
const listeners = new Set<() => void>();

function set(next: string | null): void {
  if (next === name) return;
  name = next;
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

  open(next: string): void {
    set(next);
  },

  close(): void {
    set(null);
  },
};
