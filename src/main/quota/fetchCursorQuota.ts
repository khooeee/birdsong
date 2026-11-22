import { fetchJson } from "./fetchJson";
import { parseCursorUsage } from "./parseCursorUsage";
import type { QuotaReading } from "./QuotaReading";
import { readKeychain } from "./readKeychain";

/** Cursor's included usage, or null when `cursor-agent` is not logged in (macOS keychain only). */
export async function fetchCursorQuota(): Promise<QuotaReading | null> {
  const token = await readKeychain("cursor-access-token");
  if (!token) return null;
  const body = await fetchJson(
    "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
      },
      body: "{}",
    },
    "Run `cursor-agent login` to log in again.",
  );
  return parseCursorUsage(body);
}
