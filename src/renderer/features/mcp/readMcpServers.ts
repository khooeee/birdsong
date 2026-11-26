import { isPlainObject } from "./isPlainObject";
import type { McpServerItem } from "./McpServerItem";

/** mcp.json text as its servers in order, or null when the form can't show it and only JSON can fix it. */
export function readMcpServers(text: string): McpServerItem[] | null {
  if (!text.trim()) return [];
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(root)) return null;
  const servers = root.mcpServers ?? {};
  if (!isPlainObject(servers)) return null;
  const items: McpServerItem[] = [];
  for (const [name, raw] of Object.entries(servers)) {
    if (!isPlainObject(raw)) return null;
    items.push({ name, raw });
  }
  return items;
}
