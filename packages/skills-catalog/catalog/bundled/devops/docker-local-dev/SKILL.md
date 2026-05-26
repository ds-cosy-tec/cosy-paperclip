---
name: docker-local-dev
description: Diagnose and fix Docker-based local dev problems — port conflicts, stale containers/images/volumes, host arch mismatches, networking failures, file-mount permissions, and slow rebuilds.
key: paperclipai/bundled/devops/docker-local-dev
recommendedForRoles:
  - engineer
  - devops
tags:
  - docker
  - local-dev
  - troubleshooting
  - compose
---

# Docker Local Dev

Diagnose recurring local-dev failures with Docker and Compose. The goal is to reach a clean reproducible local stack quickly — not to redesign the project's Docker setup.

## When to use

- A `docker compose up` (or equivalent) fails on a developer machine when CI is green.
- A container is "running" but a service is unreachable.
- Builds are unexpectedly slow or always rebuild every layer.
- A teammate reports "works on mine, fails on yours" Docker behavior.
- A new dependency or base image was bumped and the local stack stopped working.

## When not to use

- You are designing production container images. Defer to a Dockerfile/security review skill.
- The symptom is not Docker-specific (app bug visible without containers). Debug the app first.

## Diagnostic order

Work from outside in. Do not jump to rebuilding the image until you have ruled out the cheap explanations.

1. **Daemon and engine.** `docker info` succeeds and reports the expected engine version, OS, storage driver, and platform. If this fails, fix the host before anything else.
2. **Compose project state.** `docker compose ps` shows which services are present, their state, and exposed ports. Note `Exit 0/1/137` codes — they hint at OOM, manual stop, or healthcheck failure.
3. **Container logs.** `docker compose logs <service>` for the failing service. Look at the first error, not the most recent — later errors are often consequences.
4. **Network reachability.** `docker compose exec <service> sh` then `curl` / `nc` / `getent hosts` for the target service name. Most "can't connect" errors are name resolution against the wrong network or a service not yet healthy.
5. **Port conflicts on host.** `lsof -iTCP:<port> -sTCP:LISTEN` (or `ss -ltnp`) for each forwarded port. Another process on the host can quietly take the port.
6. **Image age and arch.** `docker image inspect <image>` to confirm `Architecture` matches host (`amd64`, `arm64`). Cross-arch images run via emulation and are slow or broken.
7. **Mount and permission issues.** Files written by container as root may be unwritable on the host. Bind-mount paths that do not exist on the host create empty directories. Check `docker compose config` for the resolved mount sources.
8. **Cache, volumes, and dangling state.** `docker system df` to see space usage. Stale named volumes can carry old DB state that breaks new migrations.

## Common fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Port already allocated | Another local process or stale container | Stop the conflicting process or `docker compose down --remove-orphans` |
| App can't reach DB by service name | Service not on the same network or not healthy | Inspect `docker compose config`, add a `depends_on: condition: service_healthy` |
| `exec format error` | Image built for wrong arch | Re-pull with `--platform=$(uname -m)` or rebuild from source |
| `permission denied` on bind mount | UID mismatch between container user and host | Build image with matching UID/GID or use a named volume |
| Always rebuilds from scratch | Bad layer ordering or untagged base | Reorder `COPY` after dependency install; pin base image tag |
| OOM kill (`Exit 137`) | Host memory limit too low | Raise Docker Desktop memory or set a service `mem_limit` and reduce concurrency |
| DB migration fails on fresh `up` but worked before | Stale named volume from prior schema | `docker compose down -v` (destructive — confirm with team) |
| Services flap healthy/unhealthy | Healthcheck too aggressive or check path missing | Increase `start_period`; verify the healthcheck command runs in-container |

## Clean reset (use sparingly)

When state is clearly corrupt and you have backups or non-precious data:

```sh
docker compose down --remove-orphans -v
docker system prune -f
docker compose pull
docker compose build --pull
docker compose up
```

This destroys named volumes for the project. Confirm with the team before running in a shared env.

## What to record after a fix

- The exact failing command and the first error from logs.
- The root cause in one sentence.
- The minimal command sequence that recovers the stack.
- Whether the fix belongs in the repo (Dockerfile/compose change) or in personal setup (host config, doc note).

## Anti-patterns

- Running `docker system prune --volumes` reflexively. It destroys other projects' state.
- Adding `--no-cache` to every build to "just be sure". It hides cache invalidation bugs and slows the loop.
- Ignoring `depends_on` health conditions and putting `sleep` in app start commands.
- Mounting `node_modules` from the host on a different arch — silent ABI mismatches follow.
