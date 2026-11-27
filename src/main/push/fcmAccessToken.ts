import { createSign } from "node:crypto";
import type { FcmServiceAccount } from "./parseFcmServiceAccount";

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
/** Tokens last an hour; fetch a new one this long before it runs out. */
const MARGIN_MS = 5 * 60 * 1000;

let cached: { identity: string; token: string; until: number } | null = null;

/** An OAuth access token for FCM, signed with the service account's key. Reused until close to expiry. */
export async function fcmAccessToken(account: FcmServiceAccount, now = Date.now()): Promise<string> {
  const identity = `${account.clientEmail}\n${account.privateKey}`;
  if (cached && cached.identity === identity && now < cached.until) return cached.token;
  const iat = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: account.clientEmail, scope: SCOPE, aud: account.tokenUri, iat, exp: iat + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  signer.end();
  const assertion = `${header}.${claims}.${base64url(signer.sign(account.privateKey))}`;
  const response = await fetch(account.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: unknown; expires_in?: unknown };
  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(`Google refused the FCM service account (${response.status}).`);
  }
  const lifetimeMs = (typeof body.expires_in === "number" ? body.expires_in : 3600) * 1000;
  cached = { identity, token: body.access_token, until: now + lifetimeMs - MARGIN_MS };
  return cached.token;
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}
