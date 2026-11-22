import { createSign } from "node:crypto";

const CACHE_MS = 50 * 60 * 1000;

let cached: { identity: string; jwt: string; until: number } | null = null;

/** ES256 provider token for APNs. Reused until it is 50 minutes old. */
export function apnsJwt(pem: string, keyId: string, teamId: string, now = Date.now()): string {
  const identity = `${keyId}\n${teamId}\n${pem}`;
  if (cached && cached.identity === identity && now < cached.until) return cached.jwt;
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = base64url(JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) }));
  const signingInput = `${header}.${payload}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({ key: pem, dsaEncoding: "ieee-p1363" });
  const jwt = `${signingInput}.${base64url(signature)}`;
  cached = { identity, jwt, until: now + CACHE_MS };
  return jwt;
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}
