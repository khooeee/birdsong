import * as fs from "node:fs/promises";
import { encryptedSecretFile } from "../storage/encryptedSecretFile";
import { fcmKeyEncPath } from "../storage/userDataPaths";
import { parseFcmServiceAccount, type FcmServiceAccount } from "./parseFcmServiceAccount";

const secret = encryptedSecretFile(fcmKeyEncPath, "push", "the FCM service account");

/** Firebase service account key (JSON) imported into app data, encrypted with safeStorage (OS keychain). */
export const fcmKeyStore = {
  remove: secret.remove,
  info: secret.info,

  /** The saved key, or null when none is saved or it no longer parses. */
  async read(): Promise<FcmServiceAccount | null> {
    const text = await secret.read();
    if (!text) return null;
    try {
      return parseFcmServiceAccount(text);
    } catch {
      return null;
    }
  },

  /** Import the picked JSON key into encrypted app storage. */
  async importFromPath(sourcePath: string): Promise<void> {
    const text = await fs.readFile(sourcePath, "utf8");
    parseFcmServiceAccount(text);
    await secret.write(text.trim());
  },
};
