import type { SessionConfigPickers } from "../../shared/sessionConfigPickers";
import type { SessionConfigSelect } from "../../shared/sessionConfigSelect";
import type { SessionConfigOptions } from "./SessionConfigOptions";

const PICKER_CATEGORIES = new Set(["model", "thought_level", "model_config"]);

/** The selects the model and effort pickers offer, with the current model and effort names. */
export function configPickers(config: SessionConfigOptions): SessionConfigPickers {
  const options = config.list().filter((option): option is SessionConfigSelect =>
    option.type === "select" && PICKER_CATEGORIES.has(option.category ?? ""),
  );
  return { options, modelConfig: config.snapshot() };
}
