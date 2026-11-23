import type { BrowserWindow } from "electron";
import type { ConfigMenuCategory } from "../../shared/configMenuCategory";
import { showConfigOptionMenu } from "../contextMenus/showConfigOptionMenu";
import { connectSessionConfig } from "./connectSessionConfig";
import type { SessionDeps } from "./SessionDeps";

/** Pop the model or effort picker for a session (connecting its agent if needed) and apply the pick. */
export async function showSessionConfigMenu(
  deps: SessionDeps,
  win: BrowserWindow | null,
  sessionId: string,
  category: ConfigMenuCategory,
): Promise<void> {
  const config = await connectSessionConfig(deps, sessionId);
  const choice = await showConfigOptionMenu(win, config.list(), category);
  if (choice) await config.set(choice.configId, choice.value);
}
