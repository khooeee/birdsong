import { useEffect } from "react";
import { dialogOpen } from "./dialogOpen";

/**
 * Session and File menu clicks arrive as `birdsong:menu-command` (sent from main via preload) naming
 * the window event the command stands for. They stand down while a dialog or modal is open.
 */
export function useMenuCommands(): void {
  useEffect(() => {
    const onCommand = (event: Event) => {
      const name = (event as CustomEvent<unknown>).detail;
      if (typeof name !== "string") return;
      if (dialogOpen()) return;
      window.dispatchEvent(new CustomEvent(name));
    };
    window.addEventListener("birdsong:menu-command", onCommand);
    return () => window.removeEventListener("birdsong:menu-command", onCommand);
  }, []);
}
