import type { InworldVoice } from "../../shared/inworldVoice";
import { isRecord } from "../../shared/isRecord";
import { inworldRequest } from "./inworldRequest";

const PAGE_SIZE = 500;
/** Inworld's system catalog plus a workspace's own voices fits in a page or two; stop a runaway cursor. */
const MAX_PAGES = 10;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toVoice(raw: unknown): InworldVoice | null {
  if (!isRecord(raw)) return null;
  const voiceId = text(raw.voiceId);
  if (!voiceId) return null;
  return {
    voiceId,
    displayName: text(raw.displayName) || voiceId,
    description: text(raw.description),
    gender: text(raw.gender),
    languageCode: text(raw.languageCode) || text(raw.langCode),
    source: text(raw.source),
  };
}

/**
 * Every voice the key's workspace can speak with: Inworld's system voices and its own cloned or designed
 * ones (community voices are left out), sorted by name. Pages are offset-based, so ids are de-duplicated.
 */
export async function listInworldVoices(key: string): Promise<InworldVoice[]> {
  const voices = new Map<string, InworldVoice>();
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ pageSize: String(PAGE_SIZE), orderBy: "display_name asc" });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await inworldRequest(key, `/voices/v1/voices?${params}`, { signal: AbortSignal.timeout(15_000) });
    const body = (await res.json()) as unknown;
    if (!isRecord(body)) break;
    for (const raw of Array.isArray(body.voices) ? body.voices : []) {
      const voice = toVoice(raw);
      if (voice && !voices.has(voice.voiceId)) voices.set(voice.voiceId, voice);
    }
    pageToken = text(body.nextPageToken);
    if (!pageToken) break;
  }
  return [...voices.values()];
}
