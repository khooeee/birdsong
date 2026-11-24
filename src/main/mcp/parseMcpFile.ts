import type * as acp from "@agentclientprotocol/sdk/unstable";
import { errorMessage } from "../../shared/errorMessage";

/** Expand `${VAR}` from the environment; unset variables become empty. */
function expand(value: string): string {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key: string) => process.env[key] ?? "");
}

function pair(entry: unknown, what: string): { name: string; value: string } {
  if (!entry || typeof entry !== "object") throw new Error(`expected ${what} to be { name, value }`);
  const { name, value } = entry as Record<string, unknown>;
  if (typeof name !== "string" || !name) throw new Error(`expected ${what} to have a name`);
  if (typeof value !== "string") throw new Error(`expected ${what} ${JSON.stringify(name)} to have a string value`);
  return { name, value: expand(value) };
}

function pairs(entry: unknown, key: string): { name: string; value: string }[] {
  const raw = (entry as Record<string, unknown>)[key];
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`expected ${key} to be a list of { name, value }`);
  return raw.map((item) => pair(item, key));
}

function parseEntry(entry: unknown): acp.McpServer {
  if (!entry || typeof entry !== "object") throw new Error("expected an object");
  const raw = entry as Record<string, unknown>;
  if (raw.enabled !== undefined && typeof raw.enabled !== "boolean") {
    throw new Error("expected enabled to be a boolean");
  }
  if (typeof raw.name !== "string" || !raw.name) throw new Error("name is required");
  if (raw.type === "stdio") {
    if (typeof raw.command !== "string" || !raw.command) throw new Error("command is required");
    const args = raw.args === undefined ? [] : raw.args;
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
      throw new Error("expected args to be a list of strings");
    }
    // ACP's stdio variant carries no `type` field; `command` marks it.
    return {
      name: raw.name,
      command: expand(raw.command),
      args: args.map(expand),
      env: pairs(raw, "env"),
    };
  }
  if (raw.type === "http") {
    if (typeof raw.url !== "string" || !raw.url) throw new Error("url is required");
    return { type: "http", name: raw.name, url: expand(raw.url), headers: pairs(raw, "headers") };
  }
  throw new Error(`unsupported type ${JSON.stringify(raw.type)}; use "stdio" or "http"`);
}

/** Validate parsed mcp.json. Bad entries are skipped and described in `errors`. */
export function parseMcpFile(parsed: unknown): { servers: acp.McpServer[]; errors: string[] } {
  const list = (parsed as { mcpServers?: unknown } | null)?.mcpServers;
  if (!Array.isArray(list)) return { servers: [], errors: ['expected { "mcpServers": [...] }'] };
  const servers: acp.McpServer[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  list.forEach((entry, index) => {
    try {
      // Disabled entries are skipped silently; they are intentional, not errors.
      if (entry && typeof entry === "object" && (entry as Record<string, unknown>).enabled === false) return;
      const server = parseEntry(entry);
      if (server.name === "birdsong") throw new Error('name "birdsong" is reserved');
      if (seen.has(server.name)) throw new Error(`duplicate name ${JSON.stringify(server.name)}`);
      seen.add(server.name);
      servers.push(server);
    } catch (error) {
      errors.push(`mcpServers[${index}]: ${errorMessage(error)}`);
    }
  });
  return { servers, errors };
}
