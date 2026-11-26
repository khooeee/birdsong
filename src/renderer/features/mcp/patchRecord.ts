/** `record` with `patch` applied; an undefined value removes that key. Key order stays. */
export function patchRecord(
  record: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...record, ...patch };
  for (const [key, value] of Object.entries(patch)) if (value === undefined) delete next[key];
  return next;
}
