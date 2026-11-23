import * as fs from "node:fs/promises";
import { safeStorage } from "electron";
import type { ApnsKeyInfo } from "../../shared/apnsKeyInfo";
import { getAppSettings, patchAppSettings } from "../appSettings";
import { isMissingFile } from "../storage/isMissingFile";
import { apnsKeyEncPath } from "../storage/userDataPaths";
import { writeFileAtomic } from "../storage/writeFileAtomic";

/** Decrypted once per launch so the keychain is not asked on every turn. */
let cached: string | null | undefined;

/** Linux without a keyring falls back to a fixed obfuscation key. */
async function secure(): Promise<boolean> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
  return process.platform !== "linux" || safeStorage.getSelectedStorageBackend() !== "basic_text";
}

function checkPem(pem: string): string {
  const trimmed = pem.trim();
  if (!trimmed.includes("BEGIN") || !trimmed.includes("PRIVATE KEY")) {
    throw new Error("That file is not a .p8 private key.");
  }
  return trimmed;
}

async function save(pem: string): Promise<void> {
  await writeFileAtomic(apnsKeyEncPath(), (await safeStorage.encryptStringAsync(pem)).toString("base64"));
}

/** APNs auth key (.p8) imported into app data, encrypted with safeStorage (OS keychain). */
export const apnsKeyStore = {
  async read(): Promise<string | null> {
    if (cached !== undefined) return cached;
    try {
      const body = await fs.readFile(apnsKeyEncPath(), "utf8");
      const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(Buffer.from(body.trim(), "base64"));
      cached = result || null;
      if (cached && shouldReEncrypt) save(cached).catch(() => console.warn("[push] could not re-encrypt the APNs key"));
    } catch (error) {
      if (!isMissingFile(error)) console.warn("[push] could not read the APNs key");
      cached = null;
    }
    return cached;
  },

  /** Import the picked .p8 into encrypted app storage. */
  async importFromPath(sourcePath: string): Promise<void> {
    const pem = checkPem(await fs.readFile(sourcePath, "utf8"));
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error("OS encryption is unavailable, so the key cannot be stored safely.");
    await save(pem);
    cached = pem;
  },

  async remove(): Promise<void> {
    await fs.rm(apnsKeyEncPath(), { force: true });
    cached = null;
  },

  async info(): Promise<ApnsKeyInfo> {
    return { hasKey: !!(await this.read()), secure: await secure() };
  },

  /** One-time move from the old `apnsKeyPath` setting into encrypted storage. True when settings changed. */
  async migrateLegacy(): Promise<boolean> {
    const legacyPath = getAppSettings().apnsKeyPath?.trim();
    if (!legacyPath) return false;
    try {
      await fs.access(apnsKeyEncPath());
      patchAppSettings({ apnsKeyPath: "" });
      return true;
    } catch {
      // No encrypted key yet; fall through to import.
    }
    let pem: string;
    try {
      pem = checkPem(await fs.readFile(legacyPath, "utf8"));
    } catch {
      return false;
    }
    try {
      if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
      await save(pem);
      cached = pem;
    } catch (error) {
      console.warn("[push] could not migrate the APNs key");
      return false;
    }
    patchAppSettings({ apnsKeyPath: "" });
    return true;
  },
};
