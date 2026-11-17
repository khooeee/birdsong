import { useEffect, useRef } from "react";

type Props = {
  name: string;
  /** The new name on Enter; null on Escape or when focus leaves. */
  onDone: (name: string | null) => void;
};

/** Inline name field of the tree row being renamed. */
export function FileTreeRename({ name, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    // Like Finder: typing replaces the name and keeps the extension.
    const dot = name.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : name.length);
  }, [name]);

  return (
    <input
      ref={inputRef}
      className="explorer-rename"
      defaultValue={name}
      aria-label="File name"
      spellCheck={false}
      onBlur={() => onDone(null)}
      onKeyDown={(event) => {
        // Arrows, Home, End and Enter belong to the field, not the tree.
        event.stopPropagation();
        if (event.key !== "Enter" && event.key !== "Escape") return;
        event.preventDefault();
        const tree = event.currentTarget.closest<HTMLElement>(".explorer-tree");
        onDone(event.key === "Enter" ? event.currentTarget.value.trim() || null : null);
        tree?.focus();
      }}
    />
  );
}
