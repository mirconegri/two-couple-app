---
trigger: always_on
---

# Always-on skill: Ponytail (`full`)

Apply the [`ponytail`](../skills/ponytail/SKILL.md) skill at level `full` on every task in this repository unless the user explicitly switches level or says `stop ponytail` / `normal mode`.

- Solve the full task with the smallest complete diff; deletion beats addition.
- Reuse existing helpers, components, platform features, and installed dependencies before writing new code.
- Before editing a bug or shared function, inspect all callers, tests, and config it touches.
- Never cut trust-boundary validation, data-loss prevention, security, accessibility, or user-requested behaviour.
- Leave a small test or self-check for any new non-trivial logic, and end replies with 1–2 lines noting what was skipped/unchecked and any risks.

## Repository conventions
- Keep all code, UI copy, comments, tests, and commit messages in English.
- Never commit secrets (`.env`, `google-services.json`, keystores, tokens).
- Run `npm run typecheck` and `npm test` before finishing changes.
