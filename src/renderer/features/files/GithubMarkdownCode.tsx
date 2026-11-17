import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import type { ExtraProps } from "react-markdown";
import { highlightMarkdownCode } from "./highlightMarkdownCode";
import "./markdownCode.css";

/** Color labelled code fences without changing their text or interpreting it as HTML. */
export function GithubMarkdownCode({ node: _node, children, className, ...props }: ComponentPropsWithoutRef<"code"> & ExtraProps) {
  const language = /(?:^|\s)language-(\S+)/.exec(className ?? "")?.[1] ?? "";
  const source = typeof children === "string" ? children : "";
  const [highlighted, setHighlighted] = useState<{
    source: string;
    language: string;
    tokens: Awaited<ReturnType<typeof highlightMarkdownCode>>;
  } | null>(null);

  useEffect(() => {
    if (!language || !source) return;
    let stale = false;
    void highlightMarkdownCode(source, language).then((tokens) => {
      if (!stale) setHighlighted({ source, language, tokens });
    });
    return () => { stale = true; };
  }, [source, language]);

  const tokens = highlighted?.source === source && highlighted.language === language ? highlighted.tokens : null;
  return (
    <code {...props} className={className}>
      {tokens ? tokens.map(({ text, className: tokenClass }, index) =>
        tokenClass ? <span key={index} className={tokenClass}>{text}</span> : text) : children}
    </code>
  );
}
