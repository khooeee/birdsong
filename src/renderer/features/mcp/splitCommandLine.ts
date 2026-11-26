/** Words of a command line, honouring quotes and backslashes but expanding nothing, so `${VAR}` stays as typed. */
export function splitCommandLine(line: string): string[] {
  const words: string[] = [];
  let word = "";
  let inWord = false;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote === "'") {
      if (char === "'") quote = null;
      else word += char;
    } else if (char === "\\" && i + 1 < line.length) {
      word += line[++i];
      inWord = true;
    } else if (quote === '"') {
      if (char === '"') quote = null;
      else word += char;
    } else if (char === "'" || char === '"') {
      quote = char;
      inWord = true;
    } else if (/\s/.test(char)) {
      if (inWord) words.push(word);
      word = "";
      inWord = false;
    } else {
      word += char;
      inWord = true;
    }
  }
  if (inWord) words.push(word);
  return words;
}
