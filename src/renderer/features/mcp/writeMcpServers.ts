import { formatMcpJson } from "./formatMcpJson";
import { isPlainObject } from "./isPlainObject";
import type { McpServerItem } from "./McpServerItem";

/** mcp.json text with `servers` in place of its old ones; other top-level keys stay. Nothing left gives empty text. */
export function writeMcpServers(text: string, servers: McpServerItem[]): string {
  let root: Record<string, unknown> = {};
  try {
    const parsed: unknown = text.trim() ? JSON.parse(text) : {};
    if (isPlainObject(parsed)) root = parsed;
  } catch {
    // The form only edits text that parses, so this is the empty file.
  }
  const rest = { ...root };
  delete rest.mcpServers;
  if (!servers.length && !Object.keys(rest).length) return "";
  const mcpServers = Object.fromEntries(servers.map(({ name, raw }) => [name, raw]));
  return formatMcpJson({ ...rest, mcpServers });
}
