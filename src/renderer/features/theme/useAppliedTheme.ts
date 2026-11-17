import { useSyncExternalStore } from "react";
import type { Theme } from "../../../shared/appSettings";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function appliedTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** The theme currently on `<html data-theme>`; re-renders when it changes. */
export function useAppliedTheme(): Theme {
  return useSyncExternalStore(subscribe, appliedTheme);
}
