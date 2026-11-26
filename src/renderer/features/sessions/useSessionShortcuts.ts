import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { visibleTabOrder } from "../../../shared/tabNav/visibleTabOrder";
import { useEffect } from "react";
import { pinShortcut } from "./pinShortcut";
import { dialogOpen } from "../shortcuts/dialogOpen";

function toggleActivePin(pinned: Session[], unpinned: Session[], activeTabId: ActiveTabId) {
  if (!activeTabId) return;
  const active = [...pinned, ...unpinned].find((session) => session.id === activeTabId);
  if (!active || active.home) return;
  if (pinned.some((session) => session.id === activeTabId)) {
    void window.birdsong.unpinSession(activeTabId);
    return;
  }
  void window.birdsong.pinSession(activeTabId);
}

/** Pin toggle and Ctrl+Tab stepping. `stepDisabled` turns off stepping alone: in Files mode Ctrl+Tab steps files. */
export function useSessionShortcuts(
  pinned: Session[],
  unpinned: Session[],
  activeTabId: ActiveTabId,
  selectTab: (id: string) => void,
  disabled: boolean,
  stepDisabled: boolean,
  filterQuery = "",
) {
  useEffect(() => {
    const order = visibleTabOrder(pinned, unpinned, filterQuery);
    const step = (delta: number) => {
      if (disabled || stepDisabled || order.length === 0) return;
      const index = activeTabId ? order.indexOf(activeTabId) : -1;
      if (index < 0) {
        const fallback = delta > 0 ? order[0] : order[order.length - 1];
        if (fallback !== undefined) selectTab(fallback);
        return;
      }
      const next = order[(index + delta + order.length) % order.length];
      if (next !== undefined) selectTab(next);
    };

    const onKey = (event: KeyboardEvent) => {
      if (disabled || event.defaultPrevented || event.isComposing || dialogOpen()) return;
      if (pinShortcut.matches(event)) {
        event.preventDefault();
        toggleActivePin(pinned, unpinned, activeTabId);
        return;
      }

      if (stepDisabled || event.key !== "Tab" || !event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    };
    // Session menu clicks (see useMenuCommands).
    const menuCommands: Array<[string, () => void]> = [
      ["birdsong:toggle-pin", () => {
        if (!disabled) toggleActivePin(pinned, unpinned, activeTabId);
      }],
      ["birdsong:next-session", () => step(1)],
      ["birdsong:prev-session", () => step(-1)],
    ];
    for (const [name, handler] of menuCommands) window.addEventListener(name, handler);
    window.addEventListener("keydown", onKey, true);
    return () => {
      for (const [name, handler] of menuCommands) window.removeEventListener(name, handler);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [pinned, unpinned, activeTabId, selectTab, disabled, stepDisabled, filterQuery]);
}
