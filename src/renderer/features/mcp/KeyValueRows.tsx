import { useRef, useState } from "react";

type Row = { id: number; key: string; value: string };

type Props = {
  label: string;
  addLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  record: Record<string, string>;
  disabled: boolean;
  onChange: (record: Record<string, string>) => void;
};

/** Name/value pairs such as env or headers. Rows without a name stay on screen but out of the record. */
export function KeyValueRows({ label, addLabel, keyPlaceholder, valuePlaceholder, record, disabled, onChange }: Props) {
  const nextId = useRef(0);
  const [rows, setRows] = useState<Row[]>(() =>
    Object.entries(record).map(([key, value]) => ({ id: nextId.current++, key, value })),
  );
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.key.trim(), (counts.get(row.key.trim()) ?? 0) + 1);

  const commit = (next: Row[]) => {
    setRows(next);
    onChange(Object.fromEntries(next.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])));
  };
  const edit = (id: number, patch: Partial<Row>) => commit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <div className="mcp-group" role="group" aria-label={label}>
      <div className="mcp-group-label">{label}</div>
      {rows.map((row) => (
        <div key={row.id} className="mcp-row">
          <input
            className={row.key.trim() && counts.get(row.key.trim())! > 1 ? "mcp-invalid" : undefined}
            aria-label={`${label} name`}
            value={row.key}
            placeholder={keyPlaceholder}
            disabled={disabled}
            spellCheck={false}
            onChange={(e) => edit(row.id, { key: e.target.value })}
          />
          <input
            aria-label={`${label} value`}
            value={row.value}
            placeholder={valuePlaceholder}
            disabled={disabled}
            spellCheck={false}
            onChange={(e) => edit(row.id, { value: e.target.value })}
          />
          <button
            type="button"
            className="mcp-icon-btn"
            aria-label={`Remove ${row.key || "row"}`}
            disabled={disabled}
            onClick={() => commit(rows.filter((other) => other.id !== row.id))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="mcp-link-btn"
        disabled={disabled}
        onClick={() => setRows([...rows, { id: nextId.current++, key: "", value: "" }])}
      >
        + {addLabel}
      </button>
    </div>
  );
}
