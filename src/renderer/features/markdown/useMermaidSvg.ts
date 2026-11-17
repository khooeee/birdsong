import { useEffect, useState } from "react";
import { useAppliedTheme } from "../theme/useAppliedTheme";
import { renderMermaid } from "./renderMermaid";

// Streaming grows the fence chunk by chunk; wait for it to settle before rendering.
const RENDER_DELAY_MS = 150;

/** SVG for a mermaid source; null until it first renders. A source that fails to parse keeps the last good SVG. */
export function useMermaidSvg(source: string | null): string | null {
  const theme = useAppliedTheme();
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!source) return;
    let stale = false;
    const timer = setTimeout(() => {
      void renderMermaid(source, theme).then((next) => {
        if (!stale && next) setSvg(next);
      });
    }, RENDER_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [source, theme]);

  return source ? svg : null;
}
