import type { SessionModelConfig } from "./session";
import type { SessionConfigSelect } from "./sessionConfigSelect";

/** What the model and effort pickers offer: each select's choices, and the current names. */
export interface SessionConfigPickers {
  /** Model, effort (`thought_level`) and per-model setting (`model_config`) selects. */
  options: SessionConfigSelect[];
  modelConfig: SessionModelConfig | null;
}
