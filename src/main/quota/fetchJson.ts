const TIMEOUT_MS = 15_000;

/** GET or POST `url` and parse its JSON, naming a refused login so the user knows what to fix. */
export async function fetchJson(url: string, init: RequestInit, loginHint: string): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (response.status === 401 || response.status === 403) {
    throw new Error(`Login refused (HTTP ${response.status}). ${loginHint}`);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
