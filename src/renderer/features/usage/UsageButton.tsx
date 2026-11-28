import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UsageIcon } from "./UsageIcon";
import { UsageModal } from "./UsageModal";
import "./usage.css";

/** Rail footer button left of Settings: opens agent usage and limits. */
export function UsageButton() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  return (
    <div className="rail-usage">
      {open && createPortal(<UsageModal onClose={close} />, document.body)}
      <button
        ref={buttonRef}
        type="button"
        className={`rail-session ${open ? "active" : ""}`}
        data-tooltip="Usage"
        data-tooltip-align="center"
        aria-label="Usage"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <UsageIcon />
      </button>
    </div>
  );
}
