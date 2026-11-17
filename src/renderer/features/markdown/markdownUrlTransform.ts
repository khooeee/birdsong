import { defaultUrlTransform } from "react-markdown";
import { sessionIdFromLink } from "../../../shared/sessionIdFromLink";

/** Preserve validated session links alongside react-markdown's safe default URLs. */
export function markdownUrlTransform(url: string): string {
  return sessionIdFromLink(url) ? url : defaultUrlTransform(url);
}
