import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { usageEnv } from "./usageEnv";

/** Below the phones' 60-second request timeout, so a slow agent still answers with an error. */
const TIMEOUT_MS = 45_000;

function firstLine(text: string): string {
  // Drop ANSI styling so a CLI's colored "Error:" reads cleanly.
  return text.replace(/\x1b\[[0-9;]*m/g, "").trim().split("\n")[0] ?? "";
}

/**
 * Runs an agent CLI in the temp dir, so it picks up no project, and resolves with its stdout.
 * Rejects with the CLI's first error line on a non-zero exit, or on a timeout.
 */
export async function runUsageCommand(command: string, args: string[]): Promise<string> {
  const env = await usageEnv();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: tmpdir(), env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let done = false;
    const finish = (error: Error | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(stdout);
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error(`${command} timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error: NodeJS.ErrnoException) =>
      finish(error.code === "ENOENT" ? new Error(`Command not found: ${command}`) : error));
    child.on("close", (code) =>
      finish(code === 0 ? null : new Error(firstLine(stderr) || firstLine(stdout) || `${command} exited with ${code}`)));
  });
}
