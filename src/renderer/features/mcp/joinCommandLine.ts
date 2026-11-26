/** One line that splitCommandLine turns back into `words`; only words that need it are quoted. */
export function joinCommandLine(words: string[]): string {
  return words
    .map((word) => (word && !/[\s'"\\]/.test(word) ? word : `"${word.replace(/["\\]/g, "\\$&")}"`))
    .join(" ");
}
