# Review instructions

These rules tune Anthropic Code Review for this repo. Keep them tight: long files dilute the rules that matter most. General architecture and patterns live in the `CLAUDE.md` files; this file is for review-only guidance.

## What Important means here

Reserve 🔴 Important for findings that would break behavior in production, leak data, or block a rollback. Specifically:

- Defects in auth, session, MFA, refresh-token, cookie, or permission-check code paths
- Migrations that aren't reversible, that silently swallow foreign-key or unique-constraint violations, or that fail to restore session-level settings (`statement_timeout`, `lock_timeout`) on the error path
- Code branched on `LICENSE_SERVER_KEY`, EE flags, or other cloud-vs-self-hosted signals where one branch is unreachable, untested, or skipped entirely (e.g. seeds that early-return on cloud)
- Logic that mutates persistent state — membership, billing, secrets, identities — before the preceding step has succeeded (canonical case: promoting an invited user before MFA completes)
- Inconsistent sanitization of string-typed domain values (emails, paths, identifiers) across call sites; bonus Important if the same value is sanitized in one path and passed raw in another
- New backend dependencies that plausibly affect FIPS compatibility or materially increase the standalone container size

Style, naming, refactoring suggestions, and missing-test observations are 🟡 Nit at most.

## Always check

- Every new API route, mutation, or state transition has a CASL permission check that is exercised by a test — not just present on inspection
- After a rename, signature change, or move, every call site is updated and types are tightened so the compiler enforces the new contract; flag any remaining string-keyed or stringly-typed access
- Email / path / identifier sanitization is consistent across every code path; prefer branded types (e.g. `SanitizedEmail`) over a sanitize-on-each-call convention
- Cookie path consistency: logout must clear what login set. Watch for `/` vs `/api` mismatches on refresh-token cookies
- Function references in boolean position (`if (!isValidEmailDomain)` where `if (!isValidEmailDomain(domain))` was meant)
- Falsy checks on strings that can legally be `"0"`, `"30s"`, or other truthy-looking-but-treated-as-empty values; flag `Number(s)` coercions that lose information silently
- Feature flags added in mock license-fns must also be added in non-mock license-fns; flag asymmetric edits
- Code touching tokens, cookies, or session state should have considered multi-tab / refresh-grace / revocation-race scenarios; flag changes that don't
- State-machine flows (signup → MFA → org promotion, invite → accept → membership active): side effects must commit only after the step they belong to
- Auth methods (email/password, OAuth, SAML, OIDC, LDAP, SCIM) and MFA types (email OTP, TOTP, WebAuthn) — when one path changes, flag the others if they share the touched code

## Do not report

- Anything CI already enforces: ESLint, Prettier, TypeScript type errors, conventional-commit title format, schema validation
- Generated files: `**/dist/**`, `**/build/**`, `*.lock`, `package-lock.json`, files under `backend/src/db/schemas/` that are emitted by `npm run generate:schema`
- Documentation under `docs/` unless the change is factually wrong about current product behavior
- Test-only code that intentionally violates production rules
- Storybook stories, fixtures, and mock data
- Suggestions to add unit or e2e tests as standalone Important findings — note them in the summary or as Nits, not as blockers

## Cap the nits

Report at most five 🟡 Nits per review. If you found more, append "plus N similar items" to the summary instead of posting them inline. If every finding is a Nit, open the summary with "No blocking issues."

## On re-review

After the first review of a PR, suppress new Nits and post 🔴 Important findings only. A one-line fix should not reach round seven on style. Pre-existing 🟣 findings discovered on a re-review can still be reported.

## Summary shape

Open the review body with a one-line tally:

> `N important, M nits` — or `No blocking issues` when all findings are nits or none were found.

Lead with the shape, then the details.

## Verification bar

Behavior claims need a `file:line` citation in the source, not an inference from naming or comment text. Do not post a finding that says "function X probably does Y" without grounding it in code that has been read. If verification couldn't confirm the issue, demote to Nit or drop it.
