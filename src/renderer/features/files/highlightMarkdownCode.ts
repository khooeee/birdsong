import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { classHighlighter, highlightCode } from "@lezer/highlight";

/** Load a fence's grammar on demand; keep unknown or very large blocks as plain text. */
export async function highlightMarkdownCode(source: string, name: string) {
  if (!name || !source || source.length > 200_000) return null;
  const description = LanguageDescription.matchLanguageName(languages, name, false)
    ?? languages.find((language) => language.extensions.includes(name.toLowerCase()));
  if (!description) return null;
  try {
    const { language } = await description.load();
    const tokens: { text: string; className: string }[] = [];
    highlightCode(source, language.parser.parse(source), classHighlighter,
      (text, className) => tokens.push({ text, className }),
      () => tokens.push({ text: "\n", className: "" }));
    return tokens;
  } catch {
    return null;
  }
}
