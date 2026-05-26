---
name: aws-ops
description: Investigate AWS account state and incidents read-first — IAM identity, region/service boundaries, CloudTrail audit, billing anomalies, common service health checks (EC2, S3, RDS, Lambda) — before recommending changes.
key: paperclipai/optional/devops/aws-ops
recommendedForRoles:
  - devops
  - sre
  - security
tags:
  - aws
  - cloud
  - operations
  - incident
---

# AWS Ops Investigation

Read-first AWS investigation for a specific service, resource, or incident. The goal is to ground recommendations in actual account state — region, identity, billing, service health — before suggesting any change. AWS misconfigurations are easy to make and costly to undo; default to inspection.

## When to use

- An AWS-hosted service is failing or slow and the root cause is unclear.
- A bill spike, unfamiliar resource, or unexpected charge needs investigation.
- A user reports "permission denied" or auth failures on AWS APIs.
- You need to confirm the deployed state of a resource against what code or IaC says.

## When not to use

- You are designing AWS architecture from scratch. Use an architecture guide, not this skill.
- A change is clearly destructive (delete bucket, delete RDS, detach IAM role). Get explicit confirmation from the account owner.
- The account is shared and high-stakes (production billing-critical). Coordinate with the owner before issuing read commands that are themselves rate-limited or audited.

## Pre-flight

Before any AWS CLI call, confirm:

1. **Which identity are you?** `aws sts get-caller-identity` — account id, ARN, user/role.
2. **Which region are you targeting?** AWS resources are regional. Always pass `--region` or set `AWS_REGION` explicitly; do not rely on a default that may be `us-east-1`.
3. **Which profile are you using?** `aws configure list` — confirm credential source and profile name.

Get those three facts wrong and every later command is misleading.

## Inspection by service

Pick the table row for the service in question.

| Service | First read | Then |
|---|---|---|
| EC2 | `aws ec2 describe-instances --filters Name=instance-state-name,Values=running,stopped,stopping` | `describe-instance-status`, security groups, AMI age, attached EBS |
| EBS | `aws ec2 describe-volumes` | snapshots, volume state, attachments, iops |
| S3 | `aws s3api list-buckets`, `get-bucket-policy`, `get-bucket-encryption`, `get-bucket-versioning` | `get-public-access-block`, lifecycle, replication |
| RDS | `aws rds describe-db-instances` | parameter group, snapshots, log file list, maintenance window |
| Lambda | `aws lambda list-functions`, `get-function-configuration` | invocations & errors in CloudWatch, concurrency, layers, env |
| API Gateway | `aws apigatewayv2 get-apis` / `apigateway get-rest-apis` | stage variables, throttle settings, custom domains |
| IAM | `aws iam get-user`, `list-attached-user-policies`, `list-roles`, `get-role-policy` | last-used credentials, access analyzer findings |
| CloudWatch logs | `aws logs describe-log-groups` | `filter-log-events` with `--filter-pattern "ERROR"` for a recent window |
| CloudTrail | `aws cloudtrail lookup-events --max-results 50 --lookup-attributes AttributeKey=EventName,AttributeValue=<api>` | use to attribute changes to a principal |

## Common diagnoses

- **Permission denied.** Re-run with `--debug` if needed; look at the resource ARN in the error. Compare against the role's policy (`get-role-policy`, `simulate-principal-policy`).
- **Resource not found.** Wrong region is the most common reason. Verify region before assuming deletion.
- **Throttling.** Inspect CloudWatch metrics for the service; consider client-side jitter/backoff or a higher account quota request.
- **Bill spike.** `aws ce get-cost-and-usage` grouped by `SERVICE` and by `USAGE_TYPE` over the spike window. Identify the service driving the delta, then drill into resource-level usage.
- **Sudden config drift.** `aws cloudtrail lookup-events` filtered to the resource id; attribute the change to a principal and time.
- **Outage of a specific service.** `aws health describe-events` if you have Business or Enterprise support; otherwise the Service Health Dashboard.

## Region and account hygiene

- Resources in unexpected regions are a common cost surprise. `describe-regions` + a sweep across regions for the suspect service can find them.
- `aws organizations list-accounts` (if you are in the org management account) clarifies cross-account ownership.
- Tagging is cheap audit fuel. If resources lack tags, that itself is a finding.

## Recommending changes

Once root cause is identified:

- Phrase the fix as an IaC change (Terraform/CDK/CloudFormation) the owner can review, not a CLI invocation to run live.
- For destructive recommendations (delete, detach, terminate), include the rollback path and the cost of getting it wrong.
- Note any Service Quota change that needs a support case lead time.
- If the change crosses accounts or org SCPs, name the principal who can apply it.

## Anti-patterns

- Running mutating CLI commands before confirming identity, region, and resource ownership.
- Treating absent CloudWatch alarms as evidence of health. Absent alarms often mean nobody set them up.
- Using broad `*` IAM permissions "temporarily" to unblock. Temporary becomes permanent.
- Quoting bill numbers without the date range and account scope they were measured in.
