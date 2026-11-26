import { isPlainObject } from "./isPlainObject";
import type { McpServerFields } from "./McpServerFields";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textRecord(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((pair): pair is [string, string] => typeof pair[1] === "string"));
}

/** A server's fields, leniently: shapes the form can't show come back empty, and the check reports them. */
export function readMcpServerFields(raw: Record<string, unknown>): McpServerFields {
  const args = Array.isArray(raw.args) ? raw.args.filter((arg): arg is string => typeof arg === "string") : [];
  const command = text(raw.command);
  return {
    kind: raw.url !== undefined && raw.command === undefined ? "url" : "command",
    words: command || args.length ? [command, ...args] : [],
    env: textRecord(raw.env),
    url: text(raw.url),
    headers: textRecord(raw.headers),
    enabled: raw.enabled !== false,
  };
}
