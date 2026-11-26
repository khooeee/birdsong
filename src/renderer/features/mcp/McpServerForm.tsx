import { useRef } from "react";
import { KeyValueRows } from "./KeyValueRows";
import { McpCommandField } from "./McpCommandField";
import { McpKindPicker } from "./McpKindPicker";
import { McpNameField } from "./McpNameField";
import type { McpServerItem, McpTransport } from "./McpServerItem";
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

const KIND_KEYS: Record<McpTransport, string[]> = {
  command: ["type", "command", "args", "env"],
  url: ["type", "url", "headers"],
};

const orNothing = (record: Record<string, string>) => (Object.keys(record).length ? record : undefined);

/** Edits one server in place; fields it doesn't show stay in the entry. */
export function McpServerForm({ item, otherNames, disabled, autoFocus, onChange, onRemove }: Props) {
  const fields = readMcpServerFields(item.raw);
  // Once a transport has been shown, keep it mounted so blank rows and the typed command survive a switch.
  const seen = useRef<Record<McpTransport, boolean>>({ command: false, url: false });
  seen.current[fields.kind] = true;
  const patch = (changes: Record<string, unknown>) => onChange({ ...item, raw: patchRecord(item.raw, changes) });

  const switchKind = (kind: McpTransport) => {
    if (kind === fields.kind) return;
    const leaving = KIND_KEYS[fields.kind];
    const saved = Object.fromEntries(leaving.filter((key) => key in item.raw).map((key) => [key, item.raw[key]]));
    const cleared = Object.fromEntries(leaving.map((key) => [key, undefined]));
    const stash = { ...item.stash, [fields.kind]: saved };
    const restored = stash[kind] ?? (kind === "url" ? { url: "" } : { command: "" });
    onChange({ ...item, stash, raw: patchRecord(item.raw, { ...cleared, ...restored }) });
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
      {seen.current.command && (
        <div className="mcp-transport" hidden={fields.kind !== "command"}>
          <McpCommandField
            words={fields.words}
            disabled={disabled}
            onChange={(words) => patch({ command: words[0] ?? "", args: words.length > 1 ? words.slice(1) : undefined })}
          />
          <KeyValueRows
            label="Environment"
            addLabel="Add variable"
            keyPlaceholder="NAME"
            valuePlaceholder="value or ${VAR}"
            record={fields.env}
            disabled={disabled}
            onChange={(env) => patch({ env: orNothing(env) })}
          />
        </div>
      )}
      {seen.current.url && (
        <div className="mcp-transport" hidden={fields.kind !== "url"}>
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
            label="Headers"
            addLabel="Add header"
            keyPlaceholder="Authorization"
            valuePlaceholder="Bearer ${TOKEN}"
            record={fields.headers}
            disabled={disabled}
            onChange={(headers) => patch({ headers: orNothing(headers) })}
          />
        </div>
      )}
      <div className="mcp-form-actions">
        <button type="button" className="btn mcp-remove" disabled={disabled} onClick={onRemove}>
          Remove server
        </button>
      </div>
    </div>
  );
}
