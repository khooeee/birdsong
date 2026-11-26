export type McpTransport = "command" | "url";

/** One `mcpServers` entry as the form edits it. `raw` is what gets saved; `stash` holds the other transport so collapsing the card can bring it back. */
export type McpServerItem = {
  name: string;
  raw: Record<string, unknown>;
  stash?: Partial<Record<McpTransport, Record<string, unknown>>>;
};
