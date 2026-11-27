import * as fs from "node:fs/promises";
import { getAppSettings, patchAppSettings } from "../appSettings";
import { encryptedSecretFile } from "../storage/encryptedSecretFile";
import { apnsKeyEncPath } from "../storage/userDataPaths";

const secret = encryptedSecretFile(apnsKeyEncPath, "push", "the APNs key");

function checkPem(pem: string): string {
  const trimmed = pem.trim();
  if (!trimmed.includes("BEGIN") || !trimmed.includes("PRIVATE KEY")) {
    throw new Error("That file is not a .p8 private key.");
  }
  return trimmed;
}

/** APNs auth key (.p8) imported into app data, encrypted with safeStorage (OS keychain). */
export const apnsKeyStore = {
  read: secret.read,
  remove: secret.remove,
  info: secret.info,

  /** Import the picked .p8 into encrypted app storage. */
  async importFromPath(sourcePath: string): Promise<void> {
    await secret.write(checkPem(await fs.readFile(sourcePath, "utf8")));
  },

  /** One-time move from the old `apnsKeyPath` setting into encrypted storage. True when settings changed. */
  async migrateLegacy(): Promise<boolean> {
    const legacyPath = getAppSettings().apnsKeyPath?.trim();
    if (!legacyPath) return false;
    if (!(await secret.exists())) {
      let pem: string;
      try {
        pem = checkPem(await fs.readFile(legacyPath, "utf8"));
      } catch {
        return false;
      }
      try {
        await secret.write(pem);
      } catch {
        console.warn("[push] could not migrate the APNs key");
        return false;
      }
    }
    patchAppSettings({ apnsKeyPath: "" });
    return true;
  },
};
