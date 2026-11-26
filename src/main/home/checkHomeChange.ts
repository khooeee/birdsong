import type { BrowserWindow } from "electron";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentKind } from "../../shared/agentKind";
import type { HomeChangeCheck } from "../../shared/homeChangeCheck";
import type { Session } from "../../shared/session";
import { confirmStopHome } from "./confirmStopHome";

async function isFolder(cwd: string): Promise<boolean> {
  const stat = await fs.stat(cwd).catch(() => null);
  return !!stat?.isDirectory();
}

/**
 * Check a Home folder and agent before Settings saves them. The folder must already exist (Birdsong never
 * creates it); `~` expands. Replacing a Home chat mid-turn asks first.
 */
export async function checkHomeChange(
  win: BrowserWindow | null,
  home: Session | undefined,
  cwd: string,
  agent: AgentKind,
): Promise<HomeChangeCheck> {
  const folder = cwd.trim().replace(/^~(?=$|\/)/, os.homedir());
  if (folder && !path.isAbsolute(folder)) return { ok: false, error: "Use a full path for the Home folder." };
  if (folder && !(await isFolder(folder))) return { ok: false, error: `Home folder not found: ${folder}` };
  const replaces = !!home && (home.cwd !== folder || home.agent !== agent);
  if (replaces && home.status === "running" && !(await confirmStopHome(win, "Switch"))) return { ok: false };
  return { ok: true, cwd: folder };
}
