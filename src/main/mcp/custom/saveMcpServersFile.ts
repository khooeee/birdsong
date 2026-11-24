import * as fs from "node:fs/promises";
import { mcpServersPath } from "../../storage/userDataPaths";
import { writeFileAtomic } from "../../storage/writeFileAtomic";
import { parseMcpServers } from "./parseMcpServers";

/** Validate and save mcp.json exactly as typed, readable only by the user; empty text deletes it. */
export async function saveMcpServersFile(text: string): Promise<void> {
  const trimmed = text.trim();
  const { errors } = parseMcpServers(trimmed);
  if (errors.length) throw new Error(`MCP servers: ${errors.join("; ")}`);
  if (!trimmed) return fs.rm(mcpServersPath(), { force: true });
  await writeFileAtomic(mcpServersPath(), `${trimmed}\n`, 0o600);
}
