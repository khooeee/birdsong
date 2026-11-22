import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isRecord } from "../../shared/isRecord";
import { fetchJson } from "./fetchJson";
import { parseCodexUsage } from "./parseCodexUsage";
import type { QuotaReading } from "./QuotaReading";

/** Codex's binding window, or null when Codex is not logged in with ChatGPT. */
export async function fetchCodexQuota(): Promise<QuotaReading | null> {
  const home = process.env.CODEX_HOME || join(homedir(), ".codex");
  const raw = await readFile(join(home, "auth.json"), "utf8").catch(() => null);
  if (!raw) return null;
  const tokens: unknown = (JSON.parse(raw) as Record<string, unknown>).tokens;
  // An API-key login has no subscription quota.
  if (!isRecord(tokens) || typeof tokens.access_token !== "string") return null;
  const headers: Record<string, string> = { Authorization: `Bearer ${tokens.access_token}` };
  if (typeof tokens.account_id === "string") headers["ChatGPT-Account-Id"] = tokens.account_id;
  const body = await fetchJson(
    "https://chatgpt.com/backend-api/wham/usage",
    { headers },
    "Run a Codex session or `codex login` to refresh it.",
  );
  return parseCodexUsage(body);
}
