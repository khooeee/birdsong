import { useEffect, useRef } from "react";
import type { SaveMarkdownView } from "../../../shared/saveMarkdownView";

/** Saves this panel's markdown on `birdsong:save-view-markdown` for `view` (context menu, sent from main via preload). */
export function useSaveViewMarkdownEvent(
  view: SaveMarkdownView,
  getMarkdown: () => string,
  nameHint: string,
): void {
  // Read through a ref so streaming turns (a new getter each chunk) do not re-subscribe the listener.
  const latest = useRef({ getMarkdown, nameHint });
  latest.current = { getMarkdown, nameHint };

  useEffect(() => {
    const onSave = (event: Event) => {
      if ((event as CustomEvent<SaveMarkdownView>).detail !== view) return;
      const { getMarkdown, nameHint } = latest.current;
      void window.birdsong.saveMarkdown(getMarkdown(), nameHint).catch(console.error);
    };
    window.addEventListener("birdsong:save-view-markdown", onSave);
    return () => window.removeEventListener("birdsong:save-view-markdown", onSave);
  }, [view]);
}
