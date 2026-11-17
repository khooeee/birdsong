import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { highlightMarkdownCode } = await jiti.import("../src/renderer/features/files/highlightMarkdownCode.ts");

for (const [language, source] of [
  ["js", 'const greeting = "hello";\n'],
  ["TypeScript", 'const count: number = 42;\n'],
  ["tsx", 'const view = <span title="hello">Hi</span>;\n'],
  ["py", 'def greet():\n    return "hello"\n'],
  ["bash", 'echo "hello"\n'],
  ["json", '{"count": 42}\n'],
  ["rust", 'let count = 42;\n'],
]) {
  test(`Markdown ${language} fences receive syntax tokens without changing their text`, async () => {
    const tokens = await highlightMarkdownCode(source, language);
    assert.ok(tokens.some((token) => token.className));
    assert.equal(tokens.map((token) => token.text).join(""), source);
  });
}

test("code text preserves tabs, blank lines, Unicode and HTML-looking strings", async () => {
  const source = '\t// 🦦\n\nconst html = "<script>& quoted";\n\n';
  const tokens = await highlightMarkdownCode(source, "JS");
  assert.equal(tokens.map((token) => token.text).join(""), source);
  const comment = await highlightMarkdownCode('/* first\nsecond */\nconst n = 1;', "js");
  assert.ok(comment.some((token) => token.text.includes("second") && token.className.includes("tok-comment")));
});

test("unlabelled, unknown, Mermaid and oversized fences retain plain text", async () => {
  for (const name of ["", "unknown-language", "not-javascript", "mermaid", "text"]) {
    const tokens = await highlightMarkdownCode("const n = 1;", name);
    assert.ok(!tokens?.some((token) => token.className));
  }
  assert.equal(await highlightMarkdownCode("x".repeat(200_001), "js"), null);
});
