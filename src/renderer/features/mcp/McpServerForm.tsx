import { useRef } from "react";
import { KeyValueRows } from "./KeyValueRows";
import { McpCommandField } from "./McpCommandField";
import { McpKindPicker } from "./McpKindPicker";
import { McpNameField } from "./McpNameField";
import type { McpServerFields } from "./McpServerFields";
import type { McpServerItem } from "./McpServerItem";
import { patchRecord } from "./patchRecord";
import { readMcpServerFields } from "./readMcpServerFields";

type Props = {
  item: McpServerItem;
  otherNames: string[];
  disabled: boolean;
  autoFocus: boolean;
  onChange: (item: McpServerItem) => void;
  onRemove: () => void;
};

const KIND_KEYS: Record<McpServerFields["kind"], string[]> = {
  command: ["type", "command", "args", "env"],
  url: ["type", "url", "headers"],
};

const orNothing = (record: Record<string, string>) => (Object.keys(record).length ? record : undefined);

/** Edits one server in place; fields it doesn't show stay in the entry. */
export function McpServerForm({ item, otherNames, disabled, autoFocus, onChange, onRemove }: Props) {
  const fields = readMcpServerFields(item.raw);
  // What the other kind had, so flipping back and forth loses nothing.
  const stash = useRef<Partial<Record<McpServerFields["kind"], Record<string, unknown>>>>({});
  const patch = (changes: Record<string, unknown>) => onChange({ ...item, raw: patchRecord(item.raw, changes) });

  const switchKind = (kind: McpServerFields["kind"]) => {
    const leaving = KIND_KEYS[fields.kind];
    stash.current[fields.kind] = Object.fromEntries(leaving.filter((key) => key in item.raw).map((key) => [key, item.raw[key]]));
    const cleared = Object.fromEntries(leaving.map((key) => [key, undefined]));
    patch({ ...cleared, ...(stash.current[kind] ?? (kind === "url" ? { url: "" } : { command: "" })) });
  };

  return (
    <div className="mcp-form">
      <McpNameField
        name={item.name}
        otherNames={otherNames}
        disabled={disabled}
        autoFocus={autoFocus}
        onRename={(name) => onChange({ ...item, name })}
      />
      <McpKindPicker kind={fields.kind} disabled={disabled} onChange={switchKind} />
      {fields.kind === "command" ? (
        <>
          <McpCommandField
            words={fields.words}
            disabled={disabled}
            onChange={(words) => patch({ command: words[0] ?? "", args: words.length > 1 ? words.slice(1) : undefined })}
          />
          <KeyValueRows
            key="env"
            label="Environment"
            addLabel="Add variable"
            keyPlaceholder="NAME"
            valuePlaceholder="value or ${VAR}"
            record={fields.env}
            disabled={disabled}
            onChange={(env) => patch({ env: orNothing(env) })}
          />
        </>
      ) : (
        <>
          <label>
            URL
            <input
              className="mcp-mono"
              value={fields.url}
              disabled={disabled}
              spellCheck={false}
              placeholder="https://example.com/mcp"
              onChange={(e) => patch({ url: e.target.value })}
            />
          </label>
          <KeyValueRows
            key="headers"
            label="Headers"
            addLabel="Add header"
            keyPlaceholder="Authorization"
            valuePlaceholder="Bearer ${TOKEN}"
            record={fields.headers}
            disabled={disabled}
            onChange={(headers) => patch({ headers: orNothing(headers) })}
          />
        </>
      )}
      <div className="mcp-form-actions">
        <button type="button" className="btn mcp-remove" disabled={disabled} onClick={onRemove}>
          Remove server
        </button>
      </div>
    </div>
  );
}
