import { useState, type ComponentPropsWithoutRef } from "react";
import type { ExtraProps } from "react-markdown";
import { CheckIcon } from "../copy/CheckIcon";
import { CopyIcon } from "../copy/CopyIcon";
import { useCopiedFlash } from "../copy/useCopiedFlash";
import { codeBlockText } from "./codeBlockText";
import { MermaidDiagram } from "./MermaidDiagram";
import { mermaidSource } from "./mermaidSource";
import { useMermaidSvg } from "./useMermaidSvg";
import { WrapIcon } from "./WrapIcon";
import "../copy/eventActionButton.css";

/** Fenced code block with wrap and copy icons; copies the rendered code text, not the fence.
    A ```mermaid fence shows as a diagram once it parses; the copy icon still copies its source. */
export function MarkdownCodeBlock({ node, ...props }: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
  const [copied, copy] = useCopiedFlash();
  const [wrap, setWrap] = useState(false);
  const label = copied ? "Copied" : "Copy Code";
  const wrapLabel = wrap ? "Disable wrap" : "Enable wrap";
  const diagramSource = mermaidSource(node);
  const diagramSvg = useMermaidSvg(diagramSource);

  return (
    <div className={`markdown-code-block${wrap ? " wrapping" : ""}`}>
      {diagramSvg ? <MermaidDiagram svg={diagramSvg} /> : <pre {...props} />}
      <div className="markdown-code-actions">
        {diagramSvg ? null : (
          <button
            type="button"
            className={`event-action markdown-code-wrap${wrap ? " on" : ""}`}
            aria-label={wrapLabel}
            aria-pressed={wrap}
            data-tooltip={wrapLabel}
            data-tooltip-align="center"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setWrap((on) => !on);
            }}
          >
            <WrapIcon />
          </button>
        )}
        <button
          type="button"
          className={`event-action markdown-code-copy${copied ? " copied" : ""}`}
          aria-label={label}
          data-tooltip={label}
          data-tooltip-align="center"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            copy(diagramSource ?? codeBlockText(event.currentTarget.closest(".markdown-code-block")));
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}
