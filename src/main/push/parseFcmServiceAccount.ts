/** The fields of a Firebase service account key that sending an FCM message needs. */
export type FcmServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
};

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
  return { projectId, clientEmail, privateKey, tokenUri: field("token_uri") || "https://oauth2.googleapis.com/token" };
}
