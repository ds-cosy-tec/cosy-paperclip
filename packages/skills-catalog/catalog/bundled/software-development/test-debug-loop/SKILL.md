---
name: test-debug-loop
description: Diagnose a failing test by reproducing it in isolation, narrowing to the minimal failing case, identifying the smallest fix, and adding a regression assertion before declaring done.
key: paperclipai/bundled/software-development/test-debug-loop
recommendedForRoles:
  - engineer
  - qa
tags:
  - testing
  - debugging
  - regressions
---

# Test Debug Loop

A repeatable loop for chasing a failing test to root cause without flailing. The bar is: you can name the cause in one sentence, the fix is minimal, and the regression cannot silently return.

## When to use

- A specific test is failing locally or in CI and you are expected to fix it.
- A previously passing test became flaky and the team wants it stable or quarantined.
- A bug report includes reproducible behavior that should be encoded as a test.

## When not to use

- The failure is a build, lint, or typecheck error. Fix those at the toolchain level first; they are not test debugging.
- The whole suite is failing across many files. Suspect an environment, dependency, or migration issue and triage that first.
- You are tempted to skip the test instead of fixing the code. Do not skip without a tracked follow-up issue and an explicit decision.

## The loop

1. **Reproduce in isolation.** Run only the failing test (`pnpm vitest run path/to/file -t "name"`, `pytest -k`, `go test -run`, etc.). If it does not fail in isolation, the failure is order-dependent — bisect against the suite to find the polluting test.
2. **Read the assertion, not the stack trace.** What exact value or behavior was expected, and what was produced? The stack tells you where, not why.
3. **Narrow the input.** Strip the test down to the smallest setup that still fails. If a fixture has 20 fields and only 3 matter, prove it.
4. **Form one hypothesis.** Write it down in plain English before changing code. "The cache returns stale data when the user id changes within the same request." If you cannot state a hypothesis, you are still in the reading phase.
5. **Confirm the hypothesis with a minimal probe.** A targeted log line, an extra assertion, or a debugger breakpoint. One probe per hypothesis. Remove the probe after confirming.
6. **Pick the smallest fix.** The smallest fix that addresses the root cause, not the smallest fix that makes the test pass. Patching the test output to match a wrong code path is not a fix.
7. **Add a regression assertion.** Either tighten the failing test so the original bug cannot return, or add a new focused test for the specific case. State the original failure mode in the test name or a comment.
8. **Run the full suite.** Confirm the fix did not break anything else. Re-run any test you saw flake earlier.

## Flake handling

- Reproduce the flake by running the test 50+ times in isolation. If it does not flake in isolation, suspect order or shared state.
- Common causes: time-based assertions without a clock fake, random data without a seeded RNG, shared global state between tests, network or filesystem races, locale or timezone.
- Do not "retry until green" as a fix. Either stabilize, narrow the assertion, or quarantine with a tracked follow-up issue.

## What to record

- The reproduction command.
- The one-sentence root cause.
- The minimal fix and why it is minimal.
- The new or tightened test that locks in the fix.

That record is what reviewers need to approve confidently and what future debuggers need when the bug rhymes with something else.

## Anti-patterns

- Adding `sleep`/`wait` to mask a race.
- Loosening an assertion to make the test pass.
- "Fixing" the test by mocking the very behavior under test.
- Bundling an unrelated refactor into the fix commit so the diff hides what changed.
- Skipping the regression assertion because "the bug is obvious now". It will not be obvious in six months.
