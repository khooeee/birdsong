/** In double quotes a backslash only escapes these; `\w` in a Windows path stays a backslash. */
const DOUBLE_QUOTE_ESCAPES = new Set(['"', "\\", "$", "`", "\n"]);

/** Words of a command line, honouring quotes and backslashes but expanding nothing, so `${VAR}` stays as typed. */
export function splitCommandLine(line: string): string[] {
  const words: string[] = [];
  let word = "";
  let inWord = false;
  let quote: "'" | '"' | null = null;
  const take = (char: string) => {
    word += char;
    inWord = true;
  };
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote === "'") {
      if (char === "'") quote = null;
      else take(char);
    } else if (quote === '"') {
      if (char === "\\" && i + 1 < line.length && DOUBLE_QUOTE_ESCAPES.has(line[i + 1])) take(line[++i]);
      else if (char === '"') quote = null;
      else take(char);
    } else if (char === "\\" && i + 1 < line.length) {
      take(line[++i]);
    } else if (char === "'" || char === '"') {
      quote = char;
      inWord = true;
    } else if (/\s/.test(char)) {
      if (inWord) words.push(word);
      word = "";
      inWord = false;
    } else {
      take(char);
    }
  }
  if (inWord) words.push(word);
  return words;
}
