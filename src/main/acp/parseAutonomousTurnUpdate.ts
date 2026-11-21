export function parseAutonomousTurnUpdate(params: unknown) {
  const { sessionId, update } = (params ?? {}) as {
    sessionId?: unknown;
    update?: { sessionUpdate?: unknown; taskType?: unknown; asyncTaskId?: unknown; state?: unknown; summary?: unknown };
  };
  const id = update?.asyncTaskId;
  if (typeof sessionId !== "string" || typeof id !== "string" || !id.startsWith("autonomous-turn-")) return null;
  if (update?.sessionUpdate === "async_task_spawned" && update.taskType === "turn") {
    return { sessionId, id, state: "started" } as const;
  }
  if (update?.sessionUpdate !== "async_task_state_update") return null;
  const { state, summary } = update;
  if (state !== "completed" && state !== "failed" && state !== "stopped") return null;
  return { sessionId, id, state, summary: typeof summary === "string" ? summary : undefined } as const;
}
