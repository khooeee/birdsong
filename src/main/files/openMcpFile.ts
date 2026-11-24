import * as fs from "node:fs/promises";
import { shell } from "electron";
import { mcpPath } from "../storage/userDataPaths";

/** Create mcp.json when missing, then open it in the default editor. */
export async function openMcpFile(): Promise<void> {
  const file = mcpPath();
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, '{ "mcpServers": [] }\n', "utf8");
  }
  const error = await shell.openPath(file);
  if (error) throw new Error(error);
}
