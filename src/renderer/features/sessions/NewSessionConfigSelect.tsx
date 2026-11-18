import type { SessionConfigSelect } from "../../../shared/sessionConfigSelect";

interface Props {
  label: string;
  config: SessionConfigSelect | undefined;
  loading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function NewSessionConfigSelect({ label, config, loading, disabled, onChange }: Props) {
  const choices = config?.options ?? [];
  const current = config?.currentValue ?? "";
  const includesCurrent = choices.some((entry) =>
    "group" in entry ? entry.options.some((option) => option.value === current) : entry.value === current,
  );
  return (
    <label>
      {label}
      <select value={current} disabled={disabled || !choices.length} onChange={(event) => onChange(event.target.value)}>
        {!includesCurrent && <option value={current}>{current || (loading ? "Loading…" : "Agent default")}</option>}
        {choices.map((entry) =>
          "group" in entry ? (
            <optgroup key={entry.group} label={entry.name}>
              {entry.options.map((option) => (
                <option key={option.value} value={option.value}>{option.name}</option>
              ))}
            </optgroup>
          ) : <option key={entry.value} value={entry.value}>{entry.name}</option>,
        )}
      </select>
    </label>
  );
}
