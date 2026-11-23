# Verify pure logic in Lean 4

Models two small pure slices of Birdsong and proves their core properties.
Run with `lean verify/CronMatches.lean` and `lean verify/ForkTitle.lean`
using Lean 4.36.0.

## Why these slices

Surveyed pure logic in Birdsong:

- cron expression parsing and matching (`parseCronExpression`, `cronMatches`)
- fork title allocation (`nextForkTitle`)
- session link parsing (`sessionIdFromLink`)
- cron title formatting (`formatCronTitle`)
- reminder due-date resolution (`resolveDueAt`)

Cron matching won first: small, pure, critical path for scheduled runs, and
its star versus non-star day logic is easy to state wrong. Fork titles won
second: allocation freshness is a real invariant (a duplicate title would
confuse fork identity), and the search loop is easy to model. The remaining
candidates are mostly string plumbing with less proof value.

## What is proven

Cron matching: time gating, star day-field conjunction, non-star
disjunction, and Sunday `7` folding to `0`.

Fork titles: the template ground truth, suffix reuse as the starting index,
and the search core — a successful search never moves backwards, never
returns a taken title, stops when the first candidate is free, and advances
past taken candidates.

## Limits

This models the matcher and the allocator only, not the scheduler, file
parsing, timers, time zones, or the fork regex itself. It does not verify
the Electron app.
