const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "url",
  "tel",
  "email",
  "password",
  "number",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
]);

/**
 * True when the focused element takes typed text, so caret keys like Cmd+Left must keep
 * their text meaning. CodeMirror's contenteditable editor counts as text entry too.
 * A textarea marked `data-history-when-empty` stops counting while it is blank, so history
 * shortcuts still work from an empty composer and the caret keys come back once it has text.
 */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return !isBlankHistoryField(target);
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
}

function isBlankHistoryField(field: HTMLTextAreaElement): boolean {
  return field.dataset.historyWhenEmpty !== undefined && field.value.trim() === "";
}
