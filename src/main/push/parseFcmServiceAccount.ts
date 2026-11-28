/** The fields of a Firebase service account key that sending an FCM message needs. */
export type FcmServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
};

const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

/** Reads a service account key downloaded from Firebase; throws a readable error for any other file. */
export function parseFcmServiceAccount(text: string): FcmServiceAccount {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("That file is not JSON. Use the service account key from Firebase.");
  }
  const field = (name: string) => (typeof raw[name] === "string" ? (raw[name] as string).trim() : "");
  const projectId = field("project_id");
  const clientEmail = field("client_email");
  const privateKey = field("private_key");
  if (raw.type !== "service_account" || !projectId || !clientEmail || !privateKey.includes("PRIVATE KEY")) {
    throw new Error("That file is not a service account key. In Firebase, open Project settings → Service accounts → Generate new private key.");
  }
  // The project ID goes into the FCM URL path, so it must be plain characters only.
  if (!/^[a-z0-9-]{1,100}$/.test(projectId)) throw new Error("That service account key has an invalid project_id.");
  return { projectId, clientEmail, privateKey, tokenUri: googleTokenUri(field("token_uri")) };
}

/** The key's `token_uri` receives our signed JWT, so it must be Google's own HTTPS token endpoint. */
function googleTokenUri(value: string): string {
  if (!value) return DEFAULT_TOKEN_URI;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("That service account key has an invalid token_uri.");
  }
  if (url.protocol !== "https:" || url.hostname !== "oauth2.googleapis.com") {
    throw new Error("That service account key sends its token request somewhere other than Google.");
  }
  return value;
}
