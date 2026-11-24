export function isHttpUrl(text: string): boolean {
  return /^https?:\/\//i.test(text) && URL.canParse(text);
}
