import type { SessionConfigPickers } from "../../shared/sessionConfigPickers";
import { configPickers } from "../acp/configPickers";
import { connectSessionConfig } from "./connectSessionConfig";
import type { SessionDeps } from "./SessionDeps";

/**
 * Pick a model, effort or per-model setting, after checking the agent still offers it.
 * Returns the updated choices: a new model can change the efforts on offer.
 */
export async function setSessionConfigOption(
  deps: SessionDeps,
  sessionId: string,
  configId: string,
  value: string,
): Promise<SessionConfigPickers> {
  const config = await connectSessionConfig(deps, sessionId);
  const option = configPickers(config).options.find((entry) => entry.id === configId);
  if (!option) throw new Error(`Unknown config option: ${configId}`);
  const choices = option.options.flatMap((entry) => "group" in entry ? entry.options : [entry]);
  if (!choices.some((choice) => choice.value === value)) throw new Error("This choice is no longer available");
  if (option.currentValue !== value) await config.set(configId, value);
  return configPickers(config);
}
