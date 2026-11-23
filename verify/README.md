# Verify cron matching in Lean 4

Models `cronMatches` from `src/main/crons/cronMatches.ts` and proves its
day-field logic. Run with `lean verify/CronMatches.lean` using Lean 4.36.0.

## Why this slice

Surveyed pure logic in Birdsong:

- cron expression parsing and matching (`parseCronExpression`, `cronMatches`)
- fork title allocation (`nextForkTitle`)
- session link parsing (`sessionIdFromLink`)
- cron title formatting (`formatCronTitle`)
- reminder due-date resolution (`resolveDueAt`)

Cron matching won: small, pure, critical path for scheduled runs, and its
star versus non-star day logic is easy to state wrong. The other candidates
are mostly string plumbing with less proof value.

## What is proven

Time gating, star day-field conjunction, non-star disjunction, and Sunday
`7` folding to `0`.

## Limits

This models the matcher only, not the scheduler, file parsing, timers, or
time zones. It does not verify the Electron app.
