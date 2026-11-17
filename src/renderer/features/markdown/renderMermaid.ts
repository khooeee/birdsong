import type { Theme } from "../../../shared/appSettings";

let renderCount = 0;

/** Renders mermaid source to an SVG string; null when it does not parse (e.g. a fence still streaming). */
export async function renderMermaid(source: string, theme: Theme): Promise<string | null> {
  // Lazy: mermaid is large and most sessions never show a diagram.
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    htmlLabels: false,
    theme: theme === "light" ? "default" : "dark",
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--font-ui"),
  });

  try {
    if (!(await mermaid.parse(source, { suppressErrors: true }))) return null;
    return (await mermaid.render(`mermaid-${++renderCount}`, source)).svg;
  } catch {
    return null;
  }
}
