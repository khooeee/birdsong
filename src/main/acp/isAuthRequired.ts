/** ACP `auth_required` (-32000): the agent's CLI is not signed in (Mistral Vibe says "Missing API key"). */
export function isAuthRequired(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === -32000 && typeof message === "string" && /auth|api key/i.test(message);
}
