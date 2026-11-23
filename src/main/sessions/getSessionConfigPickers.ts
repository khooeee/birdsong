import type { SessionConfigPickers } from "../../shared/sessionConfigPickers";
import { configPickers } from "../acp/configPickers";
import { connectSessionConfig } from "./connectSessionConfig";
import type { SessionDeps } from "./SessionDeps";

/** The session's model, effort and per-model choices, connecting its agent first if needed. */
export async function getSessionConfigPickers(deps: SessionDeps, sessionId: string): Promise<SessionConfigPickers> {
  return configPickers(await connectSessionConfig(deps, sessionId));
}
