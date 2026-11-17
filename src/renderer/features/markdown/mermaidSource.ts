import type { ExtraProps } from "react-markdown";

/** Source of a ```mermaid fence from its hast `pre` node; null for any other code block. */
export function mermaidSource(node: ExtraProps["node"]): string | null {
  const code = node?.children[0];
  if (code?.type !== "element" || code.tagName !== "code") return null;
  const classes = code.properties.className;
  if (!Array.isArray(classes) || !classes.includes("language-mermaid")) return null;
  const text = code.children[0];
  return text?.type === "text" ? text.value.replace(/\n$/, "") : null;
}
