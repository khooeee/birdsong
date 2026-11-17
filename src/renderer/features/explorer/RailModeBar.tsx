import type { ComponentType } from "react";
import type { RailMode } from "../../../shared/railMode";
import { modLabel } from "../shortcuts/modLabel";
import { FilesIcon } from "./FilesIcon";
import { railModeStore } from "./railModeStore";
import { SessionsIcon } from "./SessionsIcon";
import { useRailMode } from "./useRailMode";
import "./railModes.css";
import { DiffIcon } from "../diff/DiffIcon";

const MODES: Array<{ mode: RailMode; label: string; shortcut: string; Icon: ComponentType }> = [
  { mode: "sessions", label: "Sessions", shortcut: "S", Icon: SessionsIcon },
  { mode: "files", label: "Files", shortcut: "E", Icon: FilesIcon },
  { mode: "diff", label: "Diff", shortcut: "D", Icon: DiffIcon },
];

/** Icons at the top of the rail that switch the main area between the session's chat and its files. */
export function RailModeBar({ hasSessions }: { hasSessions: boolean }) {
  const current = useRailMode();
  return (
    <div className="rail-modes" role="tablist" aria-label="Rail view">
      {MODES.map(({ mode, label, shortcut, Icon }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          className={`rail-session rail-mode${current === mode ? " active" : ""}`}
          aria-selected={current === mode}
          aria-label={label}
          disabled={mode !== "sessions" && !hasSessions}
          data-tooltip={`${label} (${modLabel(shortcut, true)})`}
          data-tooltip-align="center"
          onClick={() => railModeStore.set(mode)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
