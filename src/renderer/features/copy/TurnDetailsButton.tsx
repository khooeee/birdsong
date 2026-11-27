import "./eventActionButton.css";
import { LineIcon } from "../icons/LineIcon";

/** Opens / toggles turn details (right rail) for a transcript message. */
export function TurnDetailsButton({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      type="button"
      className="event-action"
      aria-label="Turn Details"
      data-tooltip="Turn Details"
      data-tooltip-align="center"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <ChevronRightIcon />
    </button>
  );
}

function ChevronRightIcon() {
  return (
    <LineIcon>
      <path d="m9 18 6-6-6-6" />
    </LineIcon>
  );
}
