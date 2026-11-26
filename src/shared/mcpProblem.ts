/** Something wrong with mcp.json; `server` names the entry it belongs to, or is null for the whole file. */
export type McpProblem = { server: string | null; message: string };
