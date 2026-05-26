---
name: secure-change-review
description: Lightweight threat-model pass for a small code change — identifies secrets handling, authn/authz boundaries, input validation, untrusted data flows, and dependency risk so a reviewer can sign off or escalate.
key: paperclipai/bundled/security/secure-change-review
recommendedForRoles:
  - engineer
  - security
tags:
  - security
  - review
  - threat-model
  - authn
  - authz
---

# Secure Change Review

A scoped security pass for an individual PR or change. Not a full audit — the goal is to catch the common OWASP-class issues, surface secrets exposure, and route deeper risks to a security specialist.

## When to use

- Reviewing a PR that touches authentication, authorization, secrets, user input handling, file uploads, command execution, deserialization, network calls, or dependency upgrades.
- Adding a new external integration (third-party API, webhook receiver, OAuth flow).
- Changing how data crosses a trust boundary (user input → query, untrusted file → parser, public API → internal service).
- A reviewer pings security and the change is small enough to triage in one pass.

## When not to use

- The change is genuinely security-relevant *and* large (new auth system, new tenant model, new sandboxing). Escalate to a full security review.
- The change is a pure UI refactor with no data-flow change.

## The pass

Read the diff with these prompts in order. For each one, write a one-line verdict on the PR: `ok`, `comment`, or `block`.

1. **Authentication boundary.** Does the change introduce, weaken, or bypass any authn check? Is identity established before the change executes?
2. **Authorization boundary.** Does every new code path check the actor has permission for the resource, by id and by tenancy?
3. **Input validation.** Is every new input from the user or another system validated for shape, type, length, and allowed value range before it is used?
4. **Injection surfaces.** SQL/NoSQL queries built with parameter binding (not string concat). Shell commands avoided or built from arg arrays (no `shell: true`). Template engines configured to auto-escape. HTML rendered as text by default.
5. **Output encoding.** Untrusted data crossing into HTML, JSON, logs, or filenames is encoded at the boundary.
6. **Secrets and credentials.** No secrets in code, fixtures, tests, env-example files, or logs. New env vars documented. Tokens scoped to the smallest needed permission.
7. **Untrusted file/network data.** Uploaded files are size-limited and type-checked. URLs from users go through allowlists, not blocklists. Server-side requests cannot be coerced to internal IPs (SSRF).
8. **Crypto and randomness.** Cryptographic primitives come from vetted libraries. Random values for security purposes use a CSPRNG (`crypto.randomBytes`, `secrets.token_bytes`), not `Math.random` or `random.random`.
9. **Dependency change.** New or upgraded packages: check the changelog for security notes, confirm the source is the official registry, pin to a resolved version.
10. **Logging and PII.** New logs do not contain secrets, tokens, full request bodies, or fields classified as PII without redaction.

## Severity routing

- **block**: secret in code, plaintext credential, missing authn on a sensitive route, SQL/command injection vector, hard-coded crypto key, SSRF, RCE surface. Do not approve.
- **comment**: missing input validation on non-security surface, weak logging hygiene, broad permission grant where narrower works, missing rate limit on a hot endpoint. Author can fix in the same PR.
- **ok**: no findings, or findings are out of scope for this change and tracked separately.

## What to write on the PR

Post one consolidated comment, not ten:

```md
### Security review

- Authn/Authz: <verdict + one line>
- Input/Injection: <verdict + one line>
- Secrets/PII: <verdict + one line>
- Untrusted data flows: <verdict + one line>
- Deps/Crypto: <verdict + one line>

Blocking findings:
- <if any>

Non-blocking suggestions:
- <if any>
```

If there is a blocking finding, also escalate via the team's security channel; the PR comment is not enough on its own.

## Anti-patterns

- "Looks fine" with no per-category verdicts. Reviewers learn nothing.
- Treating "tests pass" as evidence of security. Tests rarely catch injection or auth bypasses.
- Allow-listing a new dependency without skimming its changelog.
- Logging "for debugging" with full request bodies in a way that lands in shared log storage.
