import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import type { Extension } from "@codemirror/state";

const extensionAliases: Record<string, string> = {
  pyi: "py",
  mts: "ts",
  cts: "ts",
  zsh: "sh",
  jsonl: "json",
  ndjson: "json",
};

/** Syntax support by filename, then a script's shebang; unknown files stay plain text. */
export async function languageFor(path: string, source = ""): Promise<Extension> {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const extension = /\.([^.]+)$/.exec(name)?.[1].toLowerCase();
  const normalized = extension ? `file.${extensionAliases[extension] ?? extension}` : name;
  const description = LanguageDescription.matchFilename(languages, name)
    ?? LanguageDescription.matchFilename(languages, normalized)
    ?? scriptLanguage(source);
  if (!description) return [];
  try {
    return await description.load();
  } catch {
    return [];
  }
}

function scriptLanguage(source: string): LanguageDescription | null {
  // Inspect only the interpreter line, and never infer a language from ordinary prose.
  const shebang = /^#!([^\r\n]*)/.exec(source.slice(0, 512))?.[1];
  if (!shebang) return null;
  const command = shebang.trim().split(/\s+/);
  const executable = command.shift()?.split("/").at(-1);
  const interpreter = executable === "env"
    ? command.find((arg) => !arg.startsWith("-") && !arg.includes("="))
    : executable;
  const language = interpreter?.match(/^python(?:\d+(?:\.\d+)*)?$/) ? "Python"
    : interpreter?.match(/^(?:ba|da|k|z)?sh$/) ? "Shell"
    : interpreter?.match(/^(?:node|nodejs|deno|bun)$/) ? "JavaScript"
    : interpreter === "ruby" ? "Ruby"
    : interpreter === "perl" ? "Perl"
    : null;
  return language ? LanguageDescription.matchLanguageName(languages, language, false) : null;
}
