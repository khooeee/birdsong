import { isRecord } from "../../shared/isRecord";
import { formatAgentError } from "../../shared/formatAgentError";
import { claudeSessionLimitResetAt } from "./claudeSessionLimitResetAt";

/**
 * When the usage limit that failed a prompt resets (epoch ms), or null for any other failure.
 * claude-agent-acp puts the turn's latest `rate_limit_event` info on the error's `data.rateLimit`.
 */
export function usageLimitResetAt(error: unknown, now = Date.now()): number | null {
  const data = isRecord(error) ? error.data : null;
  if (isRecord(data) && data.errorKind === "rate_limit" && isRecord(data.rateLimit)) {
    const { status, resetsAt } = data.rateLimit;
    // Only a rejected quota has a reset; a passing API 429 must not schedule a resume.
    if (status === "rejected" && typeof resetsAt === "number" && Number.isFinite(resetsAt)) {
      return resetsAt * 1000; // Claude Code reports epoch seconds.
    }
  }
  // Some refused turns omit rate_limit_event, leaving the reset only in Claude's error message.
  return claudeSessionLimitResetAt(formatAgentError(error), now);
}
