import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { parseClaudeUsage } = await jiti.import("../src/main/quota/parseClaudeUsage.ts");
const { parseCodexUsage } = await jiti.import("../src/main/quota/parseCodexUsage.ts");
const { parseCursorUsage } = await jiti.import("../src/main/quota/parseCursorUsage.ts");
const { quotaLevel } = await jiti.import("../src/shared/quotaLevel.ts");

test("Claude reports its most used window", () => {
  const reading = parseClaudeUsage({
    five_hour: { utilization: 12, resets_at: "2026-11-23T03:00:00Z" },
    seven_day: { utilization: 100, resets_at: "2026-11-24T00:59:59.507073+00:00" },
    seven_day_opus: null,
  });
  assert.deepEqual(reading, { usedPercent: 100, resetsAt: Date.parse("2026-11-24T00:59:59.507Z"), window: "weekly" });
});

test("Claude's idle 5-hour window has no reset", () => {
  const reading = parseClaudeUsage({ five_hour: { utilization: 0, resets_at: null } });
  assert.deepEqual(reading, { usedPercent: 0, resetsAt: null, window: "5-hour" });
});

test("Claude without windows reads as nothing", () => {
  assert.equal(parseClaudeUsage({ five_hour: null, seven_day: null }), null);
  assert.equal(parseClaudeUsage("nope"), null);
});

test("Codex reports its binding window in ms", () => {
  const reading = parseCodexUsage({
    rate_limit: {
      primary_window: { used_percent: 99, limit_window_seconds: 604800, reset_at: 1795410070 },
      secondary_window: null,
    },
  });
  assert.deepEqual(reading, { usedPercent: 99, resetsAt: 1795410070000, window: "weekly" });
});

test("Codex picks the fuller of its 5-hour and weekly windows", () => {
  const reading = parseCodexUsage({
    rate_limit: {
      primary_window: { used_percent: 90, limit_window_seconds: 18000, reset_at: 1 },
      secondary_window: { used_percent: 40, limit_window_seconds: 604800, reset_at: 2 },
    },
  });
  assert.equal(reading.window, "5-hour");
});

test("Cursor reads its included usage and cycle end", () => {
  const reading = parseCursorUsage({
    billingCycleStart: "1794894820527",
    billingCycleEnd: "1795499620527",
    planUsage: { totalPercentUsed: 97.01923076923077 },
  });
  assert.deepEqual(reading, { usedPercent: 97.01923076923077, resetsAt: 1795499620527, window: "weekly" });
});

test("Cursor with nothing used omits the percent", () => {
  const reading = parseCursorUsage({ billingCycleStart: "0", billingCycleEnd: "0", planUsage: {} });
  assert.deepEqual(reading, { usedPercent: 0, resetsAt: null, window: "monthly" });
});

test("quota colour bands", () => {
  assert.equal(quotaLevel(79.9), "ok");
  assert.equal(quotaLevel(80), "warn");
  assert.equal(quotaLevel(100), "full");
});
