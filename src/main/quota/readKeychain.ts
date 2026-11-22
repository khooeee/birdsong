import { execFile } from "node:child_process";

/**
 * A macOS keychain password by service name, or null when missing or off macOS. Goes through
 * `security`, which the CLIs that wrote these items also use, so reading them does not prompt.
 */
export function readKeychain(service: string): Promise<string | null> {
  if (process.platform !== "darwin") return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile("security", ["find-generic-password", "-s", service, "-w"], { timeout: 5_000 }, (error, stdout) => {
      resolve(error ? null : stdout.trim() || null);
    });
  });
}
