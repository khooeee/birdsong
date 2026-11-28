import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline";
import { app } from "electron";
import { agentCli } from "../agentCli";
import { usageEnv } from "../usageEnv";

const TIMEOUT_MS = 30_000;

interface RpcMessage {
  id?: number;
  method?: string;
  result?: unknown;
  error?: { message?: string };
}

/**
 * Sends one JSON-RPC request to `codex app-server` after the initialize handshake.
 * Codex signs in and refreshes its own tokens, so nothing here touches credentials.
 */
export async function requestCodexAppServer(method: string, params: unknown = {}): Promise<unknown> {
  const env = await usageEnv();
  return new Promise((resolve, reject) => {
    const command = agentCli("codex");
    const child = spawn(command, ["app-server"], { cwd: tmpdir(), env, stdio: ["pipe", "pipe", "ignore"] });
    const send = (message: object) => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
    let done = false;
    const finish = (error: Error | null, result?: unknown) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error("codex app-server timed out")), TIMEOUT_MS);
    child.on("error", (error: NodeJS.ErrnoException) =>
      finish(error.code === "ENOENT" ? new Error(`Command not found: ${command}`) : error));
    child.on("exit", (code) => finish(new Error(`codex app-server exited with ${code}`)));
    child.stdin.on("error", () => {}); // An early exit reports through "exit".
    createInterface({ input: child.stdout }).on("line", (line) => {
      let message: RpcMessage;
      try {
        message = JSON.parse(line) as RpcMessage;
      } catch {
        return;
      }
      if (message.method) return; // Notifications and server requests are not ours to answer.
      if (message.error) return finish(new Error(message.error.message ?? "codex app-server error"));
      if (message.id === 1) {
        send({ method: "initialized" });
        send({ id: 2, method, params });
      } else if (message.id === 2) {
        finish(null, message.result);
      }
    });
    send({ id: 1, method: "initialize", params: { clientInfo: { name: "birdsong", version: app.getVersion() } } });
  });
}
