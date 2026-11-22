import type { InworldVoice } from "../../../shared/inworldVoice";

function haystack(voice: InworldVoice): string {
  const own = voice.source === "SYSTEM" ? "" : "custom mine";
  return `${voice.displayName} ${voice.voiceId} ${voice.languageCode} ${voice.gender} ${own} ${voice.description}`.toLowerCase();
}

function rank(voice: InworldVoice, query: string): number {
  const name = voice.displayName.toLowerCase();
  if (query && (name.startsWith(query) || voice.voiceId.toLowerCase().startsWith(query))) return 0;
  return 1;
}

/**
 * Voices whose name, id, language, gender or description contain every word of `query`.
 * The workspace's own voices come first, then names that start with the query, then by name.
 */
export function filterVoices(voices: InworldVoice[], query: string): InworldVoice[] {
  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const hits = words.length ? voices.filter((voice) => words.every((word) => haystack(voice).includes(word))) : [...voices];
  return hits.sort(
    (a, b) =>
      Number(a.source === "SYSTEM") - Number(b.source === "SYSTEM") ||
      rank(a, q) - rank(b, q) ||
      a.displayName.localeCompare(b.displayName),
  );
}
