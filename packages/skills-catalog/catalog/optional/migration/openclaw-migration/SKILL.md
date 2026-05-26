---
name: openclaw-migration
description: Plan a migration from an OpenClaw setup to Paperclip — inventory existing OpenClaw projects/skills/agents, map to Paperclip companies/agents/skills, sequence imports, and verify after cutover.
key: paperclipai/optional/migration/openclaw-migration
recommendedForRoles:
  - ceo
  - manager
  - engineer
tags:
  - migration
  - openclaw
  - paperclip
  - onboarding
---

# OpenClaw to Paperclip Migration

Move an existing OpenClaw workflow (single-user CLI agent setup) into Paperclip (multi-agent, company-scoped, governed) without losing prompts, skills, or running plans. The migration is an inventory pass, a mapping decision, a staged import, and a post-cutover verification.

## When to use

- A user has an OpenClaw setup with project prompts, skills, or running automations and wants to operate them through Paperclip's company model.
- A team is consolidating multiple single-user OpenClaw setups into a shared Paperclip company.
- An existing OpenClaw user wants to add governance, billing, or multi-agent coordination on top of their current workflow.

## When not to use

- The user is starting fresh and has nothing to migrate. Use a company-creation flow directly.
- The user wants to keep OpenClaw as their only surface and just call Paperclip APIs. Do not migrate — script the integration.
- The user's setup is large, customized, and time-critical. Plan the migration in phases with a real owner; this skill produces the plan, not the execution.

## Pre-migration inventory

Before deciding the Paperclip shape, list what exists in OpenClaw:

1. **Projects.** Each OpenClaw project corresponds roughly to a Paperclip project under a company. Capture name, purpose, repo (if any), and active users.
2. **Skills.** Files under the OpenClaw skills home (typically project-level or user-level). Capture path, name, description, scope (project / global), and whether they include scripts.
3. **Prompts and agent personas.** Free-form prompts the user invokes regularly. Capture purpose and triggers.
4. **Active routines or automations.** Anything scheduled, cron-driven, or running on file watches.
5. **Credentials.** External tokens, API keys, and SSH keys the workflow depends on.
6. **Data.** Local databases, caches, attachments, or state files that Paperclip-managed agents will need to read.

Record each item in a single table so the mapping pass is concrete.

## Mapping decisions

Paperclip is company-scoped. Decide:

| OpenClaw concept | Paperclip mapping |
|---|---|
| User account | Paperclip user under a company |
| Project | Paperclip project, owned by a company |
| Skill (markdown only) | Catalog install or company skill import via `paperclipai skills import` |
| Skill (with scripts) | Company skill import after security review |
| Persona prompt | Paperclip agent with custom `AGENTS.md` instructions |
| Routine / cron | Paperclip routine with schedule trigger |
| Local CLI session | `paperclipai agent local-cli <agent>` against the migrated company agent |

Open questions to resolve before the import:

- One company or multiple? Multi-tenant or single-team?
- Which existing project becomes the canonical project and which become subprojects?
- Which OpenClaw skills are operator-only vs to be shared with every agent in the new company?
- Who is the CEO/board principal for the new company?

## Staged import

Do not bulk-import everything at once. Phase the work:

### Phase 1 — Skeleton

- Create the Paperclip company (CEO selected).
- Hire the minimum agent set: at minimum a manager and one IC. Use the `paperclip-create-agent` skill.
- Import or create one canonical project.

### Phase 2 — Skills

- For each markdown-only OpenClaw skill: import via `paperclipai skills import <local-path>` and verify it shows up in the company skill list.
- For script-bearing skills: queue them behind a SecurityEngineer review issue; do not import until approved.
- For widely-used skills, attach to the relevant agents with `paperclipai skills agent sync`.

### Phase 3 — Agents and personas

- For each OpenClaw persona that is more than a one-off prompt: create a Paperclip agent with its prompt converted to `AGENTS.md` form.
- Set instructions-path if the persona stores its prompt outside the agent's home.

### Phase 4 — Routines

- For each OpenClaw cron/automation: create a Paperclip routine with the equivalent schedule trigger.
- Start with `concurrencyPolicy: skip` and `catchUpPolicy: latest_only` until proven safe.

### Phase 5 — Credentials and data

- Add external credentials as Paperclip secrets, scoped per agent.
- Migrate local state files only when an agent actually needs them. Do not blindly copy directories.

### Phase 6 — Cutover

- Stop the OpenClaw scheduled automations.
- Switch user habit to the Paperclip CLI or UI.
- Keep the OpenClaw installation read-only as a fallback for one week, then archive.

## Verification

After cutover, confirm:

- Every imported skill is listed in the company skill catalog with correct trust level and provenance.
- Each migrated agent has its expected skill set and starts a heartbeat successfully against a trivial test issue.
- Each migrated routine has fired at least once on schedule with the expected outcome.
- No OpenClaw automation is still firing in the background.
- Sensitive credentials previously stored locally are removed from the OpenClaw setup.

## Rollback plan

- Keep an export of the OpenClaw skills directory before the migration.
- Document every Paperclip object the migration creates (company id, agent ids, routine ids) in case partial rollback is needed.
- Rollback for routines is: pause the Paperclip routine and re-enable the OpenClaw cron entry.

## Anti-patterns

- Bulk-importing every OpenClaw skill without auditing scripts. Use `paperclipai skills import` per skill so each one gets reviewed.
- Running OpenClaw and Paperclip routines for the same automation in parallel. Pick one to be authoritative during cutover.
- Reusing single-user OpenClaw credentials inside a multi-agent Paperclip company. Issue scoped credentials per agent.
- Treating migration as a one-day project. Phase 2–5 above usually need their own child issues with owners and acceptance criteria.
