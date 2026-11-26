/** A list of only strings and numbers, as JSON.stringify(_, null, 2) lays it out over several lines. */
const PRIMITIVE_LIST = /\[\n\s*((?:"(?:[^"\\\n]|\\.)*"|-?[\d.eE+-]+)(?:,\n\s*(?:"(?:[^"\\\n]|\\.)*"|-?[\d.eE+-]+))*)\n\s*\]/g;

/** Two-space JSON with short lists such as `args` kept on one line, the way people write mcp.json. */
export function formatMcpJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(PRIMITIVE_LIST, (_, items: string) => `[${items.split(/,\n\s*/).join(", ")}]`);
}
