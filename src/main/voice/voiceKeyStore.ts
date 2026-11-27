import { encryptedSecretFile } from "../storage/encryptedSecretFile";
import { voiceKeyPath } from "../storage/userDataPaths";

const secret = encryptedSecretFile(voiceKeyPath, "voice", "the Inworld API key");

/** Inworld API key on disk, encrypted with safeStorage (OS keychain). */
export const voiceKeyStore = {
  read: secret.read,
  info: secret.info,

  /** Save `key`; an empty key deletes it. Accepts a pasted `Basic <key>` header too. */
  async write(key: string): Promise<void> {
    const trimmed = key.trim().replace(/^basic\s+/i, "");
    if (trimmed) await secret.write(trimmed);
    else await secret.remove();
  },
};
