import { safeStorage } from "electron";

/** True when safeStorage encrypts with a real OS keychain (Linux without a keyring falls back to a fixed key). */
export async function isSafeStorageSecure(): Promise<boolean> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
  return process.platform !== "linux" || safeStorage.getSelectedStorageBackend() !== "basic_text";
}
