import { INITIAL_THEME_ARG } from "../shared/initialThemeArg";

function setTheme(theme: string): boolean {
  const root: HTMLElement | null = document.documentElement;
  if (!root) return false;
  root.dataset.theme = theme;
  return true;
}

/** Apply the saved theme before the first paint, so launch never flashes the default one. */
export function applyInitialTheme(): void {
  const arg = process.argv.find((value) => value.startsWith(INITIAL_THEME_ARG));
  if (!arg) return;
  const theme = arg.slice(INITIAL_THEME_ARG.length);
  if (setTheme(theme)) return;
  // Preload runs before <html> is parsed; wait for it.
  const observer = new MutationObserver(() => {
    if (setTheme(theme)) observer.disconnect();
  });
  observer.observe(document, { childList: true });
}
