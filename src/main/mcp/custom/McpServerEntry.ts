/** One enabled server from mcp.json. Values may still hold `${VAR}` references. */
export type McpServerEntry =
  | { name: string; command: string; args: string[]; env: Record<string, string> }
  | { name: string; url: string; headers: Record<string, string> };
