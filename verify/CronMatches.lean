/-
Birdsong cron matcher, modeled in Lean 4.

Source of truth (TypeScript):
- src/main/crons/CronSchedule.ts
- src/main/crons/parseCronExpression.ts
- src/main/crons/cronMatches.ts
- src/main/crons/CronScheduler.ts

The model abstracts local-time extraction (`getMinutes`, `getHours`,
`getDate`, `getMonth + 1`, `getDay`) into `CronTime`, and set membership
(`ReadonlySet.has`) into list membership. Day-of-week `7` folding to `0`
(`day % 7` in `parseCronExpression`) is modeled by `normalizeDow`.
-/

structure CronTime where
  minute : Nat
  hour : Nat
  dayOfMonth : Nat
  month : Nat
  dayOfWeek : Nat
deriving DecidableEq, Repr

structure CronSchedule where
  minutes : List Nat
  hours : List Nat
  daysOfMonth : List Nat
  months : List Nat
  daysOfWeek : List Nat
  domStar : Bool
  dowStar : Bool
deriving Repr

/-- Fold Sunday `7` into `0`, as `parseCronExpression` does with `day % 7`. -/
def normalizeDow (d : Nat) : Nat :=
  d % 7

/-- Lean model of `cronMatches` in `src/main/crons/cronMatches.ts`. -/
def cronMatches (s : CronSchedule) (t : CronTime) : Bool :=
  if decide (t.minute ∈ s.minutes) then
    if decide (t.hour ∈ s.hours) then
      if decide (t.month ∈ s.months) then
        let dom := decide (t.dayOfMonth ∈ s.daysOfMonth)
        let dow := decide (t.dayOfWeek ∈ s.daysOfWeek)
        if s.domStar || s.dowStar then dom && dow else dom || dow
      else false
    else false
  else false

/-- A minute outside the schedule never fires. -/
theorem nomatch_of_minute_miss (s : CronSchedule) (t : CronTime)
    (h : decide (t.minute ∈ s.minutes) = false) :
    cronMatches s t = false := by
  unfold cronMatches
  simp [h]

/-- An hour outside the schedule never fires (when the minute hits). -/
theorem nomatch_of_hour_miss (s : CronSchedule) (t : CronTime)
    (hmin : decide (t.minute ∈ s.minutes) = true)
    (h : decide (t.hour ∈ s.hours) = false) :
    cronMatches s t = false := by
  unfold cronMatches
  simp [hmin, h]

/-- A month outside the schedule never fires (when minute and hour hit). -/
theorem nomatch_of_month_miss (s : CronSchedule) (t : CronTime)
    (hmin : decide (t.minute ∈ s.minutes) = true)
    (hhour : decide (t.hour ∈ s.hours) = true)
    (h : decide (t.month ∈ s.months) = false) :
    cronMatches s t = false := by
  unfold cronMatches
  simp [hmin, hhour, h]

/-- With either day field starred, both day fields must match (given time gate). -/
theorem star_requires_both_days (s : CronSchedule) (t : CronTime)
    (hmin : decide (t.minute ∈ s.minutes) = true)
    (hhour : decide (t.hour ∈ s.hours) = true)
    (hmon : decide (t.month ∈ s.months) = true)
    (hstar : (s.domStar || s.dowStar) = true) :
    cronMatches s t =
      (decide (t.dayOfMonth ∈ s.daysOfMonth) && decide (t.dayOfWeek ∈ s.daysOfWeek)) := by
  unfold cronMatches
  simp [hmin, hhour, hmon, hstar]

/-- With neither day field starred, either day field suffices (given time gate). -/
theorem nostar_uses_either_day (s : CronSchedule) (t : CronTime)
    (hmin : decide (t.minute ∈ s.minutes) = true)
    (hhour : decide (t.hour ∈ s.hours) = true)
    (hmon : decide (t.month ∈ s.months) = true)
    (hstar : (s.domStar || s.dowStar) = false) :
    cronMatches s t =
      (decide (t.dayOfMonth ∈ s.daysOfMonth) || decide (t.dayOfWeek ∈ s.daysOfWeek)) := by
  unfold cronMatches
  simp [hmin, hhour, hmon, hstar]

/-- Parser folds Sunday `7` into `0`. -/
theorem sunday_seven_is_sunday : normalizeDow 7 = 0 := by
  rfl

/-- `* * * * *` fires for any day when minute/hour/month gates hit. -/
def everyMinute : CronSchedule :=
  { minutes := List.range 60
    hours := List.range 24
    daysOfMonth := List.range 31 |>.map (· + 1)
    months := List.range 12 |>.map (· + 1)
    daysOfWeek := [0, 1, 2, 3, 4, 5, 6]
    domStar := true
    dowStar := true }

-- Sanity checks (evaluated by `lean`; not part of the proofs).
#eval cronMatches everyMinute { minute := 5, hour := 3, dayOfMonth := 17, month := 6, dayOfWeek := 2 }
#eval cronMatches everyMinute { minute := 61, hour := 3, dayOfMonth := 17, month := 6, dayOfWeek := 2 }
#eval normalizeDow 7
