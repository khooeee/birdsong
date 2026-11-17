import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** No shell, external diff drivers, prompts, or optional index writes. */
export async function runGit(cwd: string, args: string[], maxBuffer = 8 * 1024 * 1024): Promise<string> {
  const { stdout } = await run("git", ["--literal-pathspecs", "-c", "core.quotepath=false", ...args], {
    cwd, maxBuffer, timeout: 15_000, encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout;
}
