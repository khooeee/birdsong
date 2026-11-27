import { useEffect, useRef } from "react";

interface Props {
  id: string;
  folders: string[];
  activeIndex: number;
  onPick: (folder: string) => void;
}

function folderName(folder: string): string {
  return folder.split(/[\\/]/).filter(Boolean).pop() ?? folder;
}

/** Recent Session Folders below the folder input; the active row follows the arrow keys. */
export function RecentFolderMenu({ id, folders, activeIndex, onPick }: Props) {
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <ul id={id} className="recent-folder-menu" role="listbox" aria-label="Recent folders">
      {folders.map((folder, index) => {
        const active = index === activeIndex;
        return (
          <li
            key={folder}
            id={`${id}-${index}`}
            ref={active ? activeRef : undefined}
            role="option"
            aria-selected={active}
            className={`recent-folder-item${active ? " active" : ""}`}
            title={folder}
            onMouseDown={(event) => {
              // Keep focus in the input so blur doesn't close the menu before the pick.
              event.preventDefault();
              onPick(folder);
            }}
          >
            <span className="recent-folder-name">{folderName(folder)}</span>
            <span className="recent-folder-path">{folder}</span>
          </li>
        );
      })}
    </ul>
  );
}
