import type { ComponentPropsWithoutRef } from "react";
import type { ExtraProps } from "react-markdown";
import { sessionIdFromLink } from "../../../shared/sessionIdFromLink";

/** Session links stay in Birdsong; http(s) and mailto links open externally. */
export function MarkdownLink({ href, children }: ComponentPropsWithoutRef<"a"> & ExtraProps) {
  if (href && sessionIdFromLink(href)) {
    return (
      <a href={href} data-tooltip={href} onClick={(event) => {
        event.preventDefault();
        void window.birdsong.openSessionLink(href).catch(console.error);
      }}>{children}</a>
    );
  }
  return href && /^(https?:|mailto:)/i.test(href)
    ? <a href={href} data-tooltip={href} target="_blank" rel="noopener noreferrer">{children}</a>
    : <span>{children}</span>;
}
