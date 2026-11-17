import { indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting } from "@codemirror/language";
import { EditorState, Prec, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { editorHighlightStyle } from "./editorHighlightStyle";
import { editorLanguage } from "./editorLanguage";
import { editorTheme } from "./editorTheme";
import { editorWordWrap } from "./editorWordWrap";
import { wordWrapPreference } from "./wordWrapPreference";

/** Everything one file's editor state carries: basic setup, its language, theme, and Cmd+S. */
export function editorExtensions(language: Extension, crlf: boolean, onSave: () => void): Extension[] {
  return [
    basicSetup,
    keymap.of([indentWithTab]),
    Prec.high(keymap.of([{ key: "Mod-s", preventDefault: true, run: () => (onSave(), true) }])),
    editorLanguage.of(language),
    editorTheme,
    editorWordWrap.of(wordWrapPreference.getSnapshot() ? EditorView.lineWrapping : []),
    syntaxHighlighting(editorHighlightStyle),
    // Saves join lines with this, so Windows line endings survive an edit.
    crlf ? EditorState.lineSeparator.of("\r\n") : [],
  ];
}
