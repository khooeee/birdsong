import type { ComponentPropsWithoutRef } from "react";
import type { ExtraProps } from "react-markdown";
import { MermaidDiagram } from "../markdown/MermaidDiagram";
import { mermaidSource } from "../markdown/mermaidSource";
import { useMermaidSvg } from "../markdown/useMermaidSvg";

/** Preview code block; a ```mermaid fence shows as a diagram once it parses, as on GitHub. */
export function GithubMarkdownPre({ node, ...props }: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
  const diagramSvg = useMermaidSvg(mermaidSource(node));

  return diagramSvg ? <MermaidDiagram svg={diagramSvg} /> : <pre {...props} />;
}
