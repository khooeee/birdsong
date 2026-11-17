import type { Root } from "mdast";
import { sessionIdFromLink } from "../../../shared/sessionIdFromLink";

interface Node {
  type: string;
  value?: string;
  url?: string;
  children?: Node[];
}

/** Autolink pasted session URLs while leaving code and existing links alone. */
export function remarkSessionLinks() {
  return (tree: Root) => {
    const walk = (node: Node) => {
      if (!node.children || node.type === "link" || node.type === "linkReference") return;
      node.children = node.children.flatMap((child) => {
        if (child.type !== "text" || !child.value) {
          walk(child);
          return [child];
        }
        const text = child.value;
        const parts: Node[] = [];
        let offset = 0;
        for (const match of text.matchAll(/\bbirdsong:\/\/[^\s<>"']+/gi)) {
          const url = match[0].replace(/[.,;:!?)\]}]+$/, "");
          if (!sessionIdFromLink(url)) continue;
          if (match.index > offset) parts.push({ type: "text", value: text.slice(offset, match.index) });
          parts.push({ type: "link", url, children: [{ type: "text", value: url }] });
          offset = match.index + url.length;
        }
        if (!parts.length) return [child];
        if (offset < text.length) parts.push({ type: "text", value: text.slice(offset) });
        return parts;
      });
    };
    walk(tree);
  };
}
