import type { ComponentPropsWithoutRef } from "react";
import type { ExtraProps } from "react-markdown";

/** http(s) and mailto links open externally; anything else renders as plain text. */
export function MarkdownLink({ href, children }: ComponentPropsWithoutRef<"a"> & ExtraProps) {
  return href && /^(https?:|mailto:)/i.test(href)
    ? <a href={href} data-tooltip={href} target="_blank" rel="noopener noreferrer">{children}</a>
    : <span>{children}</span>;
}
