import { useState } from "react";
import { joinCommandLine } from "./joinCommandLine";
import { splitCommandLine } from "./splitCommandLine";

type Props = { words: string[]; disabled: boolean; onChange: (words: string[]) => void };

/** The command and its args as one line, the way server docs print it. Keeps the typed text while it is edited. */
export function McpCommandField({ words, disabled, onChange }: Props) {
  const [line, setLine] = useState(() => joinCommandLine(words));

  return (
    <label>
      Command
      <input
        className="mcp-mono"
        value={line}
        disabled={disabled}
        spellCheck={false}
        placeholder="npx -y @playwright/mcp"
        onChange={(e) => {
          setLine(e.target.value);
          onChange(splitCommandLine(e.target.value));
        }}
      />
    </label>
  );
}
