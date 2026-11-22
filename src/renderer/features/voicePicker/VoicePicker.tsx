import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { InworldVoice } from "../../../shared/inworldVoice";
import { filterVoices } from "./filterVoices";
import { findVoice } from "./findVoice";
import { VoiceOptionRow } from "./VoiceOptionRow";

type Props = {
  voices: InworldVoice[];
  /** The chosen voice id. */
  value: string;
  disabled: boolean;
  onChange: (voiceId: string) => void;
};

/**
 * Searchable voice list. Closed, the box shows the chosen voice's name; focused, it searches and the list
 * opens below it. Enter or a click picks; with no match, Enter takes the typed text as a voice id.
 */
export function VoicePicker({ voices, value, disabled, onChange }: Props) {
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const chosen = findVoice(voices, value);
  const results = useMemo(() => filterVoices(voices, query), [voices, query]);
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const index = Math.min(active, results.length - 1);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const pick = (voiceId: string) => {
    onChange(voiceId);
    close();
  };
  // Rows are memoized; a stable callback keeps typing from re-rendering every row.
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const onPick = useCallback((at: number) => {
    const voice = resultsRef.current[at];
    if (voice) pickRef.current(voice.voiceId);
  }, []);

  // Open on the chosen voice, so the list shows where it is (the query is empty while closed).
  const openList = () => {
    if (open) return;
    setOpen(true);
    setActive(Math.max(0, results.findIndex((voice) => voice.voiceId === chosen?.voiceId)));
  };

  useEffect(() => {
    if (open) listRef.current?.querySelector("[aria-selected='true']")?.scrollIntoView({ block: "nearest" });
  }, [open, index, results]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      const count = results.length;
      if (count) setActive((index + (event.key === "ArrowDown" ? 1 : -1) + count) % count);
    } else if (event.key === "Escape" && open) {
      // Close the list, not the Settings modal.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Enter" && open && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const voice = results[index];
      if (voice) pick(voice.voiceId);
      else if (query.trim()) pick(query.trim());
    }
  };

  return (
    <div className="voice-picker">
      <input
        value={open ? query : (chosen?.displayName ?? value)}
        placeholder={open ? (chosen?.displayName ?? value) || "Search voices" : undefined}
        disabled={disabled}
        spellCheck={false}
        aria-label="Voice"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={open && index >= 0 ? `${listId}-${index}` : undefined}
        onFocus={openList}
        onClick={openList}
        onBlur={close}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div
          ref={listRef}
          id={listId}
          className="voice-picker-list"
          role="listbox"
          aria-label="Voices"
          // Keep focus in the search box, so the list stays open while scrolling.
          onMouseDown={(event) => event.preventDefault()}
        >
          {results.map((voice, at) => (
            <VoiceOptionRow
              key={voice.voiceId}
              id={`${listId}-${at}`}
              index={at}
              voice={voice}
              active={at === index}
              chosen={voice.voiceId === chosen?.voiceId}
              onPick={onPick}
            />
          ))}
          {results.length === 0 && (
            <div className="voice-picker-empty">No matching voices. Press Enter to use “{query.trim()}” as a voice ID.</div>
          )}
        </div>
      )}
    </div>
  );
}
