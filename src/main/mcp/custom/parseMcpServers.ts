import { errorMessage } from "../../../shared/errorMessage";
import type { McpProblem } from "../../../shared/mcpProblem";
import { BIRDSONG_SERVER_NAME } from "../birdsongServerName";
import type { McpServerEntry } from "./McpServerEntry";
import { parseMcpServerEntry } from "./parseMcpServerEntry";

type ParsedMcpServers = { servers: McpServerEntry[]; errors: McpProblem[] };

/** Agents disagree on whether case and `-`/`_` tell names apart, so neither may. */
function nameKey(name: string): string {
  return name.toLowerCase().replaceAll("-", "_");
}

/** Validate mcp.json's text. Bad entries are skipped and described in `errors`. */
export function parseMcpServers(text: string): ParsedMcpServers {
  if (!text.trim()) return { servers: [], errors: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { servers: [], errors: [{ server: null, message: `invalid JSON: ${errorMessage(error)}` }] };
  }
  const entries = (parsed as { mcpServers?: unknown } | null)?.mcpServers;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return { servers: [], errors: [{ server: null, message: 'expected { "mcpServers": { ... } }' }] };
  }
  const servers: McpServerEntry[] = [];
  const errors: McpProblem[] = [];
  const taken = new Set([nameKey(BIRDSONG_SERVER_NAME)]);
  for (const [name, value] of Object.entries(entries)) {
    try {
      if (!name) throw new Error("name is empty");
      if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error("names can only use letters, digits, _ and -");
      if (nameKey(name) === nameKey(BIRDSONG_SERVER_NAME)) throw new Error("reserved for Birdsong's own server");
      if (taken.has(nameKey(name))) throw new Error("this name is already used");
      taken.add(nameKey(name));
      const entry = parseMcpServerEntry(name, value);
      if (entry) servers.push(entry);
    } catch (error) {
      errors.push({ server: name, message: errorMessage(error) });
    }
  }
  return { servers, errors };
}
