import { Compartment } from "@codemirror/state";

/** Reconfigure wrapping without replacing a file's document, selection, or undo history. */
export const editorWordWrap = new Compartment();
