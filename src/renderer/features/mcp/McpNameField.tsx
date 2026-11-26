import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  otherNames: string[];
  disabled: boolean;
  /** Focus and select the name, for a server just added. */
  autoFocus: boolean;
  onRename: (name: string) => void;
};

/** A server's name. A name another server has is held back, since one would replace the other. */
export function McpNameField({ name, otherNames, disabled, autoFocus, onRename }: Props) {
  const [typed, setTyped] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const clash = typed !== name && otherNames.includes(typed);

  useEffect(() => {
    if (autoFocus) inputRef.current?.select();
  }, [autoFocus]);

  return (
    <label>
      Name
      <input
        ref={inputRef}
        className={clash ? "mcp-invalid" : undefined}
        value={typed}
        disabled={disabled}
        spellCheck={false}
        onChange={(e) => {
          setTyped(e.target.value);
          if (!otherNames.includes(e.target.value)) onRename(e.target.value);
        }}
        onBlur={() => setTyped(name)}
      />
      {clash && <span className="settings-warning">Another server is called {typed}.</span>}
    </label>
  );
}
