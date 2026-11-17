import { useEffect, useEffectEvent, type RefObject } from "react";
import { trapModalTabFocus } from "./trapModalTabFocus";

/** Trap Tab inside a dialog and handle Escape. Capture dialogs also block app shortcuts. */
export function useModalKeyboard(
  dialogRef: RefObject<HTMLElement | null>,
  onEscape: (() => void) | null,
  capture = false,
): void {
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && onEscape) {
      event.preventDefault();
      if (capture) event.stopImmediatePropagation();
      onEscape();
      return;
    }
    if (dialogRef.current) trapModalTabFocus(event, dialogRef.current);
  });

  useEffect(() => {
    window.addEventListener("keydown", onKey, capture);
    return () => window.removeEventListener("keydown", onKey, capture);
  }, [capture]);
}
