import { homedir } from "node:os";
import { shellEnv } from "../shellEnv/shellEnv";

/** The user's shell environment, so agent CLIs find their PATH and sign-in the way a terminal would. */
export async function usageEnv(): Promise<NodeJS.ProcessEnv> {
  const env = await shellEnv.get();
  return { ...env, HOME: env.HOME || homedir() };
}
