import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";
import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree, highlightingFor } from "@codemirror/language";
import { highlightTree, tags } from "@lezer/highlight";

const jiti = createJiti(import.meta.url);
const { languageFor } = await jiti.import("../src/renderer/features/editor/languageFor.ts");
const { editorExtensions } = await jiti.import("../src/renderer/features/editor/editorExtensions.ts");
const { fileBufferStore } = await jiti.import("../src/renderer/features/editor/fileBufferStore.ts");

function highlightedText(state) {
  const tree = ensureSyntaxTree(state, state.doc.length, 1000);
  const tokens = [];
  if (tree) highlightTree(tree, { style: (tags) => highlightingFor(state, tags) },
    (from, to, className) => tokens.push({ text: state.sliceDoc(from, to), className }));
  return tokens;
}

for (const [path, source, expected] of [
  ["/repo/greet.py", 'def greet():\n    return "hello"\n', "def"],
  ["/repo/GREET.PY", 'def greet():\n    return "hello"\n', "def"],
  ["/repo/types.pyi", 'def greet() -> str: ...\n', "def"],
  ["/repo/index.MTS", 'const message: string = "hello";\n', "const"],
  ["/repo/index.cts", 'const message: string = "hello";\n', "const"],
  ["/repo/view.tsx", 'const view = <span title="hello" />;\n', "const"],
  ["/repo/main.js", 'const message = "hello";\n', "const"],
  ["/repo/main.rs", 'let count = 42;\n', "let"],
  ["/repo/main.go", 'package main\n', "package"],
  ["/repo/style.css", 'body { color: red; }\n', "color"],
  ["/repo/view.html", '<span title="hello">Hi</span>\n', "span"],
  ["/repo/data.JSONL", '{"count": 42}\n{"count": 43}\n', '"count"'],
  ["/repo/config.yaml", 'message: "hello"\n', '"hello"'],
  ["/repo/script.zsh", 'echo "hello"\n', '"hello"'],
  ["/repo/BUILD", 'load("//rules:defs.bzl", "rule")\n', '"//rules:defs.bzl"'],
  ["/repo/script", '#!/usr/bin/env -S python3 -u\ndef greet():\n    pass\n', "def"],
  ["/repo/script", '#!/usr/bin/python3.12\ndef greet():\n    pass\n', "def"],
  ["/repo/script", '#!/bin/bash\necho "hello"\n', '"hello"'],
  ["/repo/script", '#!/usr/bin/env NODE_ENV=production node\nconst count = 42;\n', "const"],
]) {
  test(`Files mode colors ${path} (${source.split("\n")[0]})`, async () => {
    const language = await languageFor(path, source);
    const state = EditorState.create({ doc: source, extensions: editorExtensions(language, false, () => {}) });
    assert.ok(highlightedText(state).some((token) => token.text === expected && token.className));
    assert.equal(state.sliceDoc(), source);
  });
}

test("Python keywords, strings, numbers, functions and comments have distinct theme styles", async () => {
  const source = '# comment\ndef greet():\n    return "hello", 42\n';
  const state = EditorState.create({ doc: source,
    extensions: editorExtensions(await languageFor("greet.py"), false, () => {}) });
  const tokens = highlightedText(state);
  const classes = ["# comment", "def", "greet", '"hello"', "42"].map((text) => {
    const token = tokens.find((token) => token.text === text);
    assert.ok(token?.className, `${text} should be colored`);
    return token.className;
  });
  assert.equal(new Set(classes).size, classes.length);
  assert.equal(tokens.find((token) => token.text === "def").className, highlightingFor(state, [tags.keyword]));
});

test("unknown files, prose, and unknown interpreters remain plain text", async () => {
  for (const source of ['def greet(): return "hello"', '#!/usr/bin/unknown\nhello', 'A note about python']) {
    const state = EditorState.create({ doc: source,
      extensions: editorExtensions(await languageFor("notes.unknown", source), false, () => {}) });
    assert.deepEqual(highlightedText(state), []);
  }
});

test("opening an extensionless Python script uses its contents to color the editor buffer", async () => {
  const source = '#!/usr/bin/env python3\ndef greet():\n    return "hello"\n';
  globalThis.window = { birdsong: {
    readSessionFile: async () => ({ kind: "text", text: source, mtimeMs: 1 }),
  } };
  try {
    await fileBufferStore.load("syntax-test", "/repo/script");
    const buffer = fileBufferStore.get("syntax-test", "/repo/script");
    assert.equal(buffer.kind, "text");
    assert.ok(highlightedText(buffer.live.state).some((token) => token.text === "def"));
    assert.equal(buffer.dirty, false);
    assert.equal(buffer.live.state.sliceDoc(), source);
  } finally {
    fileBufferStore.drop("syntax-test", "/repo/script");
    delete globalThis.window;
  }
});
