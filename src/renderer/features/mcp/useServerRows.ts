import { useRef, useState } from "react";
import type { McpServerItem } from "./McpServerItem";
import { reconcileServerRows, type ServerRow } from "./reconcileServerRows";

const itemKey = (item: McpServerItem) => JSON.stringify([item.name, item.raw]);

const sameOrder = (a: McpServerItem[], b: McpServerItem[]) =>
  a.length === b.length && a.every((item, index) => itemKey(item) === itemKey(b[index]));

/** Rows the list owns. Saving round-trips through JSON, which sorts numeric names first; ids and stashed fields stay. */
export function useServerRows(servers: McpServerItem[]) {
  const nextId = useRef(1);
  const takeId = () => nextId.current++;
  const [rows, setRows] = useState<ServerRow[]>(() => servers.map((server) => ({ ...server, id: takeId(), stash: server.stash ?? {} })));
  const echoed = useRef<McpServerItem[] | null>(null);
  const signature = servers.map(itemKey).join("\n");
  const [seen, setSeen] = useState(signature);

  if (signature !== seen) {
    setSeen(signature);
    const echo = echoed.current;
    echoed.current = null;
    const ownEdit = echo !== null && sameOrder(echo, servers);
    if (!ownEdit) setRows((current) => reconcileServerRows(current, servers, takeId));
  }

  const replace = (next: ServerRow[]) => {
    echoed.current = next.map(({ name, raw }) => ({ name, raw }));
    setRows(next);
  };

  return { rows, replace, takeId };
}
