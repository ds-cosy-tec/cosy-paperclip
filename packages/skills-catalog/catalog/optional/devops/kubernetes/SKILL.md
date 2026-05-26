---
name: kubernetes
description: Diagnose Kubernetes workload problems — pod state, scheduling, image pulls, probes, resource limits, networking, RBAC, and rollout failures — using read-only kubectl inspection before recommending changes.
key: paperclipai/optional/devops/kubernetes
recommendedForRoles:
  - devops
  - sre
  - engineer
tags:
  - kubernetes
  - k8s
  - troubleshooting
  - operations
---

# Kubernetes Workload Diagnosis

Read-first Kubernetes troubleshooting for a single Deployment, StatefulSet, Job, or Pod that is misbehaving. The goal is to identify root cause from `kubectl` inspection before mutating cluster state. Mutations are last-resort and should be confirmed with the cluster owner.

## When to use

- A pod is `Pending`, `CrashLoopBackOff`, `ImagePullBackOff`, `Error`, or `Evicted`.
- A rollout is stuck or rolling back unexpectedly.
- A service is reachable from inside the cluster but not from outside (or vice versa).
- A scheduled `Job` or `CronJob` is not running or is failing.

## When not to use

- The cluster itself is unhealthy (control plane down, nodes NotReady). Escalate to cluster operators; this skill assumes the cluster works.
- You need to design a workload from scratch. Use a workload-design reference, not this troubleshooting skill.
- Sensitive production. Confirm with the owner before any mutation; prefer narrow read-only inspection.

## Diagnostic order

Always start with state, then logs, then events, then descriptors. Do not edit anything in the first pass.

1. **Workload state.**
   `kubectl -n <ns> get deploy,statefulset,daemonset,job,pod -o wide` — counts replicas, readiness, age, node placement. Anomalies usually show in the count or age columns.

2. **Pod detail.**
   `kubectl -n <ns> describe pod <pod>` — read the Events section bottom-up. Most actionable signal lives there.

3. **Logs.**
   `kubectl -n <ns> logs <pod> -c <container>` for current container, `--previous` for the last terminated one. For multi-container pods, log each container, not just the app.

4. **Recent events.**
   `kubectl -n <ns> get events --sort-by=.lastTimestamp` — cluster-level explanations (scheduling decisions, probe failures, OOM kills).

5. **Resource limits and node fit.**
   `kubectl -n <ns> get pod <pod> -o yaml | yq '.spec.containers[].resources'` — does requested CPU/memory fit any available node?
   `kubectl top pod -n <ns>` and `kubectl top node` — current usage if metrics-server is present.

6. **Probes.**
   Confirm `livenessProbe`, `readinessProbe`, and `startupProbe` are configured for the actual ready signal of the app, with sensible `initialDelaySeconds`, `periodSeconds`, and `failureThreshold`.

7. **Networking.**
   `kubectl -n <ns> get svc,endpoints,ingress` — endpoints should be non-empty for a reachable service. NetworkPolicy can block what looks like working endpoints.

8. **RBAC and secrets.**
   `kubectl -n <ns> get sa,secret,configmap` — service account exists, secrets/configmaps the pod mounts exist with expected keys.

## Common diagnoses

| State | Likely cause | Inspect |
|---|---|---|
| `Pending` (no node fit) | Resource requests exceed node capacity, taints, or affinity rules | `describe pod` Events, `get nodes -o wide`, node taints/labels |
| `Pending` (no PV) | StatefulSet PVC stuck waiting for dynamic provisioner | `get pvc -n <ns>`, storage class |
| `ImagePullBackOff` | Wrong image tag, missing image pull secret, registry unreachable | Pod events, image string, `imagePullSecrets` |
| `CrashLoopBackOff` | App fails on start | `logs --previous`, exit code in `describe pod` |
| `OOMKilled` | Memory limit too low or memory leak | `describe pod`, `top pod`, container `resources.limits.memory` |
| `Unhealthy` probe | Wrong path/port, slow start, no `startupProbe` | Probe definition, app readiness behavior |
| Service has no endpoints | Selector mismatch, pod not ready | `get endpoints`, label selectors, pod readiness |
| Rollout stuck | New ReplicaSet not coming up, PDB blocking | `rollout status`, `describe deploy`, PodDisruptionBudget |
| CronJob not firing | `concurrencyPolicy: Forbid` with previous job still running, `suspend: true` | `describe cronjob`, last schedule time |

## Read-only inspection commands

Stick to these in a first pass:

```sh
kubectl -n <ns> get deploy,sts,ds,job,pod -o wide
kubectl -n <ns> describe pod <pod>
kubectl -n <ns> logs <pod> -c <container> [--previous]
kubectl -n <ns> get events --sort-by=.lastTimestamp
kubectl -n <ns> get svc,endpoints,ingress
kubectl -n <ns> get pvc,sa,secret,configmap
kubectl -n <ns> get networkpolicy
kubectl rollout status deploy/<name> -n <ns>
```

## Recommending changes

Once root cause is identified, write the fix as a small, reversible patch a cluster owner can review:

- Prefer patches against manifests in git over `kubectl edit`.
- Always include the exact image tag, resource value, or probe parameter you are changing.
- Note rollback steps. `kubectl rollout undo deploy/<name>` is the cheap path; have it ready.
- For destructive cluster operations (drain, delete PVC, force-delete pod), get explicit confirmation.

## Anti-patterns

- `kubectl delete pod <pod>` as a debugging step. It hides the cause and burns a restart budget.
- `kubectl exec` into a crashed pod (there is no shell — it crashed). Use logs.
- Raising memory limits to silence OOM without measuring usage.
- Disabling probes "to get it running". The probe was there for a reason.
- Editing live resources with `kubectl edit`; the change does not survive next apply.
