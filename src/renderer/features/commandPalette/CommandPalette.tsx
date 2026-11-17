import { memo, useCallback, useEffect, useRef, useState } from "react";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { modKey } from "../shortcuts/modKey";
import { CommandPaletteContent } from "./CommandPaletteContent";
import type { PaletteCommand } from "./PaletteCommand";
import type { PaletteTarget } from "./PaletteTarget";
import "./commandPalette.css";

/** One global picker, reachable even when there is no active session. */
export const CommandPalette = memo(function CommandPalette(target: PaletteTarget) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(true);
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    dialogRef.current?.close();
    setOpen(false);
  }, []);

  const run = useCallback((command: PaletteCommand) => {
    if (command.disabled || !dialogRef.current?.open) return;
    restoreFocus.current = false;
    dismiss();
    // Let the dialog and its subscriptions unmount before a command opens another modal or focuses a pane.
    requestAnimationFrame(() => {
      void Promise.resolve().then(command.run).catch(console.error);
    });
  }, [dismiss]);

  useEffect(() => {
    const show = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (dialog.open) {
        dialog.querySelector("input")?.focus();
        return;
      }
      if (dialogOpen()) return;
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      restoreFocus.current = true;
      dialog.showModal();
      setOpen(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !modKey(event, "p", true)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) show();
    };
    window.addEventListener("birdsong:command-palette", show);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("birdsong:command-palette", show);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="command-palette"
      aria-label="Command Palette"
      onClose={() => {
        setOpen(false);
        if (restoreFocus.current && previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
      }}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onKeyDown={(event) => {
        // Bubble shortcuts (including Escape → stop agent) must never act on the app behind this dialog.
        event.stopPropagation();
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          dismiss();
        }
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      {open ? <CommandPaletteContent target={target} onRun={run} /> : null}
    </dialog>
  );
});
