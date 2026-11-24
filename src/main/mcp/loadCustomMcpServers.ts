import * as fs from "node:fs/promises";
import type * as acp from "@agentclientprotocol/sdk/unstable";
import { errorMessage } from "../../shared/errorMessage";
import { isMissingFile } from "../storage/isMissingFile";
import { mcpPath } from "../storage/userDataPaths";
import { parseMcpFile } from "./parseMcpFile";

/** Read mcp.json. A missing file means none; bad entries are skipped with a warning, never thrown. */
export async function loadCustomMcpServers(): Promise<acp.McpServer[]> {
  let raw: string;
  try {
    raw = await fs.readFile(mcpPath(), "utf8");
  } catch (error) {
    if (!isMissingFile(error)) console.warn(`[mcp] ${String(error)}`);
    return [];
  }
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`[mcp] invalid JSON: ${errorMessage(error)}`);
    return [];
  }
  const { servers, errors } = parseMcpFile(parsed);
  for (const error of errors) console.warn(`[mcp] ${error}`);
  return servers;
}
