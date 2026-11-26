import type { McpServerFields } from "./McpServerFields";

type Kind = McpServerFields["kind"];

const KINDS: { kind: Kind; label: string }[] = [
  { kind: "command", label: "Command" },
  { kind: "url", label: "URL" },
];

/** Whether a server runs as a local command or is reached over HTTP. */
export function McpKindPicker({ kind, disabled, onChange }: { kind: Kind; disabled: boolean; onChange: (kind: Kind) => void }) {
  return (
    <div className="mcp-kind" role="radiogroup" aria-label="Connects with">
      {KINDS.map((option) => (
        <button
          key={option.kind}
          type="button"
          role="radio"
          aria-checked={option.kind === kind}
          disabled={disabled}
          onClick={() => option.kind !== kind && onChange(option.kind)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
