import * as fs from "node:fs/promises";
import { isMissingFile } from "../../storage/isMissingFile";
import { mcpServersPath } from "../../storage/userDataPaths";

/** mcp.json's text; empty when there is no file. */
export async function readMcpServersFile(): Promise<string> {
  try {
    return await fs.readFile(mcpServersPath(), "utf8");
  } catch (error) {
    if (isMissingFile(error)) return "";
    throw error;
  }
}
