/-
Birdsong fork-title allocator, modeled in Lean 4.

Source of truth (TypeScript):
- src/shared/nextForkTitle.ts
- src/main/sessions/forkSessionAtEvent.ts (`nextForkTitle(source.title, ...)`)

The model abstracts the `FORK_SUFFIX` regex (`/^(.*) \(fork #(\d+)\)$/`)
into its outcome: a `root` string and a starting index `n`. String
templating (`` `${root} (fork #${n})` ``) is modeled by `forkCandidate`;
the unbounded `for (;;)` search is modeled by `findFreshAux` with explicit
fuel. What is proven is the allocator core: it never returns a taken title
and never moves backwards.
-/

/-- `` `${root} (fork #${n})` `` in `nextForkTitle`. -/
def forkCandidate (root : String) (n : Nat) : String :=
  root ++ " (fork #" ++ toString n ++ ")"

/-- Starting index in `nextForkTitle`: reuses the suffix in `baseTitle` when
present, otherwise starts at `1`. Here the regex outcome is the input. -/
def startFrom (suffix : Option Nat) : Nat :=
  suffix.getD 1

/-- No suffix means the search starts at `1`. -/
theorem startFrom_none : startFrom none = 1 := by
  rfl

/-- A parsed suffix is reused as the starting index. -/
theorem startFrom_some (k : Nat) : startFrom (some k) = k := by
  rfl

/-- Bounded version of the `for (;; n++)` loop in `nextForkTitle`. -/
def findFreshAux (root : String) (taken : List String) (n : Nat) : Nat → Option Nat
  | 0 => none
  | Nat.succ fuel =>
    if (forkCandidate root n) ∈ taken then
      findFreshAux root taken (n + 1) fuel
    else
      some n

/-- A successful search never moves backwards. -/
theorem findFreshAux_ge (root : String) (taken : List String) (n : Nat)
    (fuel : Nat) (m : Nat)
    (h : findFreshAux root taken n fuel = some m) :
    n ≤ m := by
  induction fuel generalizing n m with
  | zero =>
    unfold findFreshAux at h
    contradiction
  | succ fuel ih =>
    unfold findFreshAux at h
    by_cases hmem : (forkCandidate root n) ∈ taken
    · simp [hmem] at h
      have hle := ih (n + 1) m h
      omega
    · simp [hmem] at h
      omega

/-- A successful search returns a title that is not taken. -/
theorem findFreshAux_fresh (root : String) (taken : List String) (n : Nat)
    (fuel : Nat) (m : Nat)
    (h : findFreshAux root taken n fuel = some m) :
    (forkCandidate root m) ∉ taken := by
  induction fuel generalizing n m with
  | zero =>
    unfold findFreshAux at h
    contradiction
  | succ fuel ih =>
    unfold findFreshAux at h
    by_cases hmem : (forkCandidate root n) ∈ taken
    · simp [hmem] at h
      exact ih (n + 1) m h
    · simp [hmem] at h
      subst h
      exact hmem

/-- When the first candidate is free, the search stops there. -/
theorem findFreshAux_of_free (root : String) (taken : List String) (n : Nat)
    (fuel : Nat)
    (h : (forkCandidate root n) ∉ taken) :
    findFreshAux root taken n (Nat.succ fuel) = some n := by
  simp [findFreshAux, h]

/-- When the first candidate is taken, the search advances past it. -/
theorem findFreshAux_of_taken (root : String) (taken : List String) (n : Nat)
    (fuel : Nat)
    (h : (forkCandidate root n) ∈ taken) :
    findFreshAux root taken n (Nat.succ fuel) =
      findFreshAux root taken (n + 1) fuel := by
  simp [findFreshAux, h]

/-- Template ground truth: mirrors `` `${root} (fork #${n})` ``. -/
theorem candidate_template : forkCandidate "Demo" 1 = "Demo (fork #1)" := by
  rfl

-- Sanity checks (evaluated by `lean`; not part of the proofs).
#eval forkCandidate "Demo" 1
#eval findFreshAux "Demo" ["Demo (fork #1)", "Demo (fork #2)"] 1 10
#eval findFreshAux "Demo" ["Demo (fork #1)", "Demo (fork #3)"] 1 10
#eval findFreshAux "Demo (fork #2)" ["Demo (fork #2)"] 2 10
#eval startFrom none
#eval startFrom (some 2)
