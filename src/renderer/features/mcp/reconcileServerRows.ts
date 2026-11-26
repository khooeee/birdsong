import type { McpServerItem } from "./McpServerItem";

/** A card's stable id, plus the draft. The id stays put when the server is renamed. */
export type ServerRow = McpServerItem & { id: number };

const rawKey = (raw: Record<string, unknown>) => JSON.stringify(raw);

const claim = (used: Set<number>, row: ServerRow | undefined) => {
  if (!row || used.has(row.id)) return undefined;
  used.add(row.id);
  return row;
};

/** Match servers coming back from mcp.json to the cards already open, so a rename keeps its draft. */
export function reconcileServerRows(prev: ServerRow[], servers: McpServerItem[], nextId: () => number): ServerRow[] {
  const used = new Set<number>();
  const assigned: (ServerRow | undefined)[] = servers.map((server, index) => {
    const row = prev[index];
    return row?.name === server.name ? claim(used, row) : undefined;
  });
  const take = (index: number, row: ServerRow | undefined) => {
    if (!assigned[index]) assigned[index] = claim(used, row);
  };

  servers.forEach((server, index) => take(index, prev.find((row) => row.name === server.name)));
  servers.forEach((server, index) => {
    const row = prev[index];
    if (row && rawKey(row.raw) === rawKey(server.raw)) take(index, row);
  });
  const names = new Set(servers.map((server) => server.name));
  servers.forEach((server, index) =>
    take(index, prev.find((row) => !names.has(row.name) && rawKey(row.raw) === rawKey(server.raw))),
  );

  return servers.map((server, index) => {
    const row = assigned[index];
    const stash = server.stash ?? row?.stash ?? {};
    return { id: row?.id ?? nextId(), name: server.name, raw: server.raw, stash };
  });
}
