import { execFileSync } from "node:child_process";

/** macOS requires the URL scheme in Info.plist even for the development Electron bundle. */
export function syncDevProtocol(plistPath) {
  let protocols = [];
  try {
    protocols = JSON.parse(execFileSync("plutil", ["-extract", "CFBundleURLTypes", "json", "-o", "-", plistPath], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }));
  } catch {
    // Electron's stock bundle has no registered protocols.
  }
  if (protocols.some((protocol) => protocol.CFBundleURLSchemes?.includes("birdsong"))) return false;
  protocols.push({ CFBundleURLName: "Birdsong Session", CFBundleURLSchemes: ["birdsong"] });
  execFileSync("plutil", ["-replace", "CFBundleURLTypes", "-json", JSON.stringify(protocols), plistPath]);
  return true;
}
