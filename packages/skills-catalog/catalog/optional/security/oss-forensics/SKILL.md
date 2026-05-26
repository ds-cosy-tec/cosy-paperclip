---
name: oss-forensics
description: Investigate a suspicious open-source package or commit — provenance, maintainer history, install scripts, network/filesystem behavior in source, and recent changes — before approving its use or escalating to security.
key: paperclipai/optional/security/oss-forensics
recommendedForRoles:
  - security
  - engineer
tags:
  - security
  - supply-chain
  - oss
  - forensics
---

# OSS Package Forensics

Investigate a suspicious open-source package, version, or commit. The goal is a defensible verdict — `safe to use`, `concerning, needs review`, or `do not use` — with citations a security engineer can audit. This skill is for read-only static investigation only; do not execute the package as part of the investigation.

## When to use

- A new dependency is proposed and looks unusual: low downloads, new maintainer, name confusingly similar to a popular package, suspicious install hooks.
- A dependency just published a version with unexpected behavior (broken builds, new network calls, unexplained size jump).
- A security advisory references a package and you need to confirm the project actually uses the affected version and surface.
- A user pastes a `curl | sh` or `pip install` line and asks if it is safe.

## When not to use

- You need to actually exploit or reverse-engineer a malicious binary. Escalate to dedicated security tooling and personnel.
- The package is internal-only and not published. Investigate via internal review, not OSS forensics.

## Hard rules

- **Do not install the package** on a developer machine, CI runner, or shared environment during investigation. Inspect source via the registry's web view, the package tarball, or a cloned git repo with execution disabled.
- **Do not run lifecycle scripts** (`postinstall`, `prepare`, etc.). If you must extract a tarball, use `--ignore-scripts` (npm) or a manual `tar -xzf` on the published artifact.
- **Do not paste the package name into LLM tools that auto-fetch.** Some tools will install or execute.

## Investigation order

1. **Identity and provenance.**
   - Exact package name and version (case-sensitive; watch for confusable characters and homoglyphs).
   - Registry source (npm, PyPI, crates.io, etc.) and direct URL.
   - Linked repository URL — confirm the linked repo really hosts the source for the published artifact.
   - Maintainer accounts. New, low-activity, recently-changed maintainers are higher risk.

2. **Popularity and history.**
   - Total downloads and weekly trend. A spike from near-zero is interesting.
   - Version history. Suspicious patterns: long stable history then a sudden major bump with unrelated changes; many same-day patch versions; a final pre-publish version differing from the git tag.
   - Open issues mentioning suspicious behavior, security, or compromise.

3. **Tarball / wheel inspection.**
   - Download the published artifact (do not install).
   - List its contents (`tar -tzf package.tgz`, `unzip -l wheel.whl`).
   - Compare published files against the linked repo. Files present in the tarball but absent from the repo are a serious red flag.

4. **Install/lifecycle scripts.**
   - npm: `package.json` `scripts.preinstall`/`install`/`postinstall`/`prepare`.
   - PyPI: `setup.py`, `pyproject.toml` build hooks, custom commands.
   - Anything that calls out to the network, writes to home directory, edits shell rc files, or invokes the host shell is high-signal.

5. **Source review.**
   - Skim entrypoints and any obfuscated files (base64-encoded blobs, very long single lines, hex strings).
   - Look for: outbound HTTP calls, subprocess execution, filesystem writes outside the package's own directory, environment-variable reads beyond what the package needs, registration of background tasks.
   - For a malicious package, the malicious code is often in only one file or one function.

6. **Dependency tree.**
   - Direct dependencies. Repeat steps 1–5 on any unfamiliar dependency.
   - Optional / peer dependencies that could shadow other packages.
   - Pinned vs unpinned ranges.

7. **External signals.**
   - Public advisories (GHSA, OSV, registry's own advisory feed).
   - Recent posts on security blogs / mailing lists referencing the package name or maintainer.
   - Social signals from the linked repo (issue activity, maintainer responsiveness).

## Verdict template

Write the verdict the way a reviewing engineer can re-run:

```md
## Package: <name>@<version> (<registry>)

**Verdict:** safe / concerning / do-not-use

**Provenance**
- Source: <link>
- Linked repo: <link>
- Maintainer(s): <name(s)>, accounts created <when>, prior packages: <n>
- Tarball SHA256: <hex>

**Behavior signals**
- Lifecycle scripts: <what they do, with line references>
- Network: <outbound calls observed in source>
- Filesystem: <writes observed in source>
- Subprocess: <execs observed in source>
- Obfuscation: <yes/no, where>

**External signals**
- Advisories: <links or "none found">
- Notable issues: <links or "none">

**Reasoning**
<one paragraph that ties evidence to verdict>

**Recommendation**
<what to do next: approve / pin / use alternative / escalate>
```

## Escalation criteria

Escalate to a security engineer if any of the following are true:

- Lifecycle scripts execute network or shell.
- Tarball contains files not in the linked repo.
- The package shadows or vendors another well-known package.
- Maintainer change happened within 30 days of the version under review.
- Obfuscated payloads are present anywhere in the package.

Do not approve a package with any of those properties without security sign-off.

## Anti-patterns

- "It has lots of downloads, must be fine." High downloads make compromise more impactful, not less likely.
- Skipping the tarball-vs-repo comparison. Many supply-chain attacks land here.
- Treating `--ignore-scripts` as a permanent fix. It is an investigation tool, not a project policy.
- Quoting your verdict without the SHA256 of the artifact you inspected. The next version is a different artifact.
