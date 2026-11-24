import { isHttpUrl } from "./isHttpUrl";
import type { McpServerEntry } from "./McpServerEntry";

const HTTP_TYPES = new Set(["http", "streamable-http", "streamableHttp"]);

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be text`);
  return value.trim();
}

function textList(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be a list of text`);
  }
  return value;
}

function textRecord(value: unknown, field: string): Record<string, string> {
  if (value === undefined) return {};
  const valid = value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.values(value).every((item) => typeof item === "string");
  if (!valid) throw new Error(`${field} must map names to text`);
  return value as Record<string, string>;
}

/** Validate one `mcpServers` entry; null when `enabled` is false. Only stdio and HTTP work in every agent. */
export function parseMcpServerEntry(name: string, value: unknown): McpServerEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("expected an object");
  const raw = value as Record<string, unknown>;
  if (raw.enabled !== undefined && typeof raw.enabled !== "boolean") throw new Error("enabled must be true or false");
  // Codex refuses the whole session over one SSE server, and Pi can't connect to it.
  if (raw.type === "sse") throw new Error("SSE is not supported; use the server's HTTP URL");
  const isHttp = raw.url !== undefined;
  if (isHttp === (raw.command !== undefined)) throw new Error("expected either command or url");
  const typeMatches = raw.type === undefined
    || (isHttp ? HTTP_TYPES.has(String(raw.type)) : raw.type === "stdio");
  if (!typeMatches) throw new Error(`type ${JSON.stringify(raw.type)} does not fit ${isHttp ? "url" : "command"}`);
  let entry: McpServerEntry;
  if (isHttp) {
    const url = text(raw.url, "url");
    // A URL with variables is checked once they are known.
    if (!url.includes("${") && !isHttpUrl(url)) throw new Error("url must start with http:// or https://");
    entry = { name, url, headers: textRecord(raw.headers, "headers") };
  } else {
    entry = { name, command: text(raw.command, "command"), args: textList(raw.args, "args"), env: textRecord(raw.env, "env") };
  }
  return raw.enabled === false ? null : entry;
}
