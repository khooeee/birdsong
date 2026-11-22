import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isRecord } from "../../shared/isRecord";
import { fetchJson } from "./fetchJson";
import { parseClaudeUsage } from "./parseClaudeUsage";
import type { QuotaReading } from "./QuotaReading";
import { readKeychain } from "./readKeychain";

/** Claude Code keeps its OAuth login in the keychain on macOS, in a file elsewhere. */
async function readCredentials(): Promise<string | null> {
  const fromKeychain = await readKeychain("Claude Code-credentials");
  if (fromKeychain) return fromKeychain;
  return readFile(join(homedir(), ".claude", ".credentials.json"), "utf8").catch(() => null);
}

/** Claude's binding window, or null when Claude Code is not logged in with a subscription. */
export async function fetchClaudeQuota(): Promise<QuotaReading | null> {
  const raw = await readCredentials();
  if (!raw) return null;
  const oauth: unknown = (JSON.parse(raw) as Record<string, unknown>).claudeAiOauth;
  if (!isRecord(oauth) || typeof oauth.accessToken !== "string") return null;
  // Claude Code refreshes the token when it next runs; refreshing it here would sign it out.
  if (typeof oauth.expiresAt === "number" && oauth.expiresAt < Date.now()) {
    throw new Error("Login expired. Run a Claude session to refresh it.");
  }
  const body = await fetchJson(
    "https://api.anthropic.com/api/oauth/usage",
    { headers: { Authorization: `Bearer ${oauth.accessToken}`, "anthropic-beta": "oauth-2025-04-20" } },
    "Run `claude` to log in again.",
  );
  return parseClaudeUsage(body);
}
