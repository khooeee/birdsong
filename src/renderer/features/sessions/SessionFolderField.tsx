import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronIcon } from "../explorer/ChevronIcon";
import { RecentFolderMenu } from "./RecentFolderMenu";
import "./sessionFolderField.css";

interface Props {
  value: string;
  recent: string[];
  disabled: boolean;
  onChange: (value: string) => void;
  /** Enter with the menu closed. */
  onSubmit: () => void;
}

/** Session Folder input with a dropdown of recent folders and a Browse button. */
export function SessionFolderField({ value, recent, disabled, onChange, onSubmit }: Props) {
  const menuId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // null while the menu is closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const open = activeIndex !== null && recent.length > 0;

  const openMenu = () => setActiveIndex(Math.max(0, recent.indexOf(value.trim())));
  const close = () => setActiveIndex(null);
  const pick = (folder: string) => {
    onChange(folder);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && recent.length) {
      event.preventDefault();
      if (activeIndex === null) return openMenu();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((activeIndex + step + recent.length) % recent.length);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      // Close the menu without cancelling the modal.
      event.stopPropagation();
      close();
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (open) pick(recent[activeIndex]);
      else onSubmit();
    }
  };

  return (
    <div className="session-folder-field">
      <div className="session-folder-combobox">
        <input
          ref={inputRef}
          value={value}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-activedescendant={open ? `${menuId}-${activeIndex}` : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            close();
          }}
          onKeyDown={onKeyDown}
          onBlur={close}
          placeholder="/path/to/project"
          spellCheck={false}
        />
        {recent.length > 0 && (
          <button
            type="button"
            className="session-folder-toggle"
            aria-label="Recent folders"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              inputRef.current?.focus();
              if (open) close();
              else openMenu();
            }}
          >
            <ChevronIcon />
          </button>
        )}
        {open && <RecentFolderMenu id={menuId} folders={recent} activeIndex={activeIndex} onPick={pick} />}
      </div>
      <button
        type="button"
        className="btn"
        disabled={disabled}
        onClick={async () => {
          const picked = await window.birdsong.pickFolder(value);
          if (picked) onChange(picked);
        }}
      >
        Browse
      </button>
    </div>
  );
}
