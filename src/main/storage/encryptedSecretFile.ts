import * as fs from "node:fs/promises";
import { safeStorage } from "electron";
import type { SecretKeyInfo } from "../../shared/secretKeyInfo";
import { isMissingFile } from "./isMissingFile";
import { isSafeStorageSecure } from "./isSafeStorageSecure";
import { writeFileAtomic } from "./writeFileAtomic";

/**
 * One secret string in app data, encrypted with safeStorage (OS keychain). Decrypted once per
 * launch so the keychain is not asked on every use. Warnings read `[tag] could not … name`.
 */
export function encryptedSecretFile(filePath: () => string, tag: string, name: string) {
  let cached: string | null | undefined;

  async function save(value: string): Promise<void> {
    await writeFileAtomic(filePath(), (await safeStorage.encryptStringAsync(value)).toString("base64"));
  }

  async function read(): Promise<string | null> {
    if (cached !== undefined) return cached;
    try {
      const body = await fs.readFile(filePath(), "utf8");
      const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(Buffer.from(body.trim(), "base64"));
      cached = result || null;
      if (cached && shouldReEncrypt) save(cached).catch(() => console.warn(`[${tag}] could not re-encrypt ${name}`));
    } catch (error) {
      if (!isMissingFile(error)) console.warn(`[${tag}] could not read ${name}`);
      cached = null;
    }
    return cached;
  }

  return {
    read,

    /** Encrypt and store `value`; throws when the OS cannot encrypt it. */
    async write(value: string): Promise<void> {
      if (!(await safeStorage.isAsyncEncryptionAvailable())) {
        throw new Error("OS encryption is unavailable, so the key cannot be stored safely.");
      }
      await save(value);
      cached = value;
    },

    async remove(): Promise<void> {
      await fs.rm(filePath(), { force: true });
      cached = null;
    },

    /** True when the encrypted file is on disk, without decrypting it. */
    async exists(): Promise<boolean> {
      try {
        await fs.access(filePath());
        return true;
      } catch {
        return false;
      }
    },

    async info(): Promise<SecretKeyInfo> {
      return { hasKey: !!(await read()), secure: await isSafeStorageSecure() };
    },
  };
}
