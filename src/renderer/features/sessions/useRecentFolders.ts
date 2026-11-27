import { useEffect, useState } from "react";

/** The Mac's suggested Session Folders, loaded once when the new session modal opens. */
export function useRecentFolders(): string[] {
  const [folders, setFolders] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    window.birdsong.recentFolders().then(
      (next) => {
        if (active) setFolders(next);
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  return folders;
}
