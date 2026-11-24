import type { McpServerEntry } from "./McpServerEntry";

/** `${VAR}` or `${VAR:-default}`, as in Claude Code's own MCP config. */
const VARIABLE = /\$\{([A-Za-z_]\w*)(?::-([^}]*))?\}/g;

/** Replace variables with their values from `env`; `missing` names the ones with neither a value nor a default. */
export function expandMcpServer(
  server: McpServerEntry,
  env: NodeJS.ProcessEnv,
): { server: McpServerEntry; missing: string[] } {
  const missing = new Set<string>();
  const expand = (text: string): string =>
    text.replace(VARIABLE, (reference: string, name: string, fallback: string | undefined) => {
      const value = env[name] ?? fallback;
      if (value === undefined) missing.add(name);
      return value ?? reference;
    });
  const expandRecord = (record: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(record).map(([key, value]) => [key, expand(value)]));
  const expanded: McpServerEntry = "url" in server
    ? { ...server, url: expand(server.url), headers: expandRecord(server.headers) }
    : { ...server, command: expand(server.command), args: server.args.map((arg) => expand(arg)), env: expandRecord(server.env) };
  return { server: expanded, missing: [...missing] };
}
