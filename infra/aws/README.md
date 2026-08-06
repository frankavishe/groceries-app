# AWS Deploy — Terraform

Implements `specs/hardening/design.md`'s AWS Deploy IaC section (M11, Req 16-18). Describes the target architecture from `specs/constitution.md`'s Tech Stack section: RDS Postgres, ElastiCache Redis, ECS/Fargate for the backend API, an ALB with an HTTPS listener as the public MNO-callback endpoint, S3 for uploads.

**Status: written and `terraform validate`-clean, not applied.** No AWS account/credentials exist in this repo — this was a deliberate scoping decision (see `specs/hardening/requirements.md`'s Scoping decision) to build everything reviewable now and defer the actual cutover rather than stall the milestone. Nothing here provisions real infrastructure until someone runs `terraform apply` with real AWS credentials.

## What this does NOT cover

- **admin-web hosting.** `constitution.md`'s AWS description only names RDS/ElastiCache/ECS/Fargate — i.e. the backend. Where admin-web ends up (Vercel, Amplify, another ECS service, etc.) is an undecided follow-up, not silently assumed here.
- **Mobile app distribution.** The Flutter app ships as an APK, not a hosted service — nothing to deploy.
- **DNS / domain registration / ACM certificate issuance.** All need a real domain, which needs a decision this repo doesn't have yet.
- **CI/CD pipeline** (build image → push to ECR → update `var.container_image` → `terraform apply` or `aws ecs update-service`). The `.github/workflows/backend-ci.yml` skeleton from M0 runs tests only; wiring it to actually deploy is a follow-up, not part of this pass.

## Before you can `apply`

1. **AWS account + credentials.** `aws configure` (or an equivalent credential source) with an IAM principal that can create VPCs/RDS/ElastiCache/ECS/IAM/Secrets Manager/ACM resources.
2. **Remote state backend.** `versions.tf` deliberately has no `backend "s3" {}` block — that needs a bucket (and ideally a DynamoDB lock table) that has to exist *before* Terraform can reference it. Bootstrap one manually (or via a separate one-off Terraform config) and then add the backend block, per Terraform's own bootstrapping order-of-operations.
3. **A domain + ACM certificate**, region `var.aws_region` (`eu-west-1` by default — see `variables.tf`'s comment on why; revisit against real latency numbers once real traffic exists). Request/validate the cert in ACM, then pass its ARN as `acm_certificate_arn`. `apply` deliberately fails on the HTTPS listener (`alb.tf`) without this — better than silently standing up an HTTP-only endpoint for MNO payment callbacks.
4. **A pushed image.** `terraform apply` needs `var.container_image` to point at a real tag in ECR, but the ECR repo itself (`ecr.tf`) is created *by* this same config. First apply: run with a placeholder/empty-ish image reference or `-target` the non-ECS resources first, push an image (`docker build` from `backend/Dockerfile`, `docker push` to the output `ecr_repository_url`), then apply again with the real tag.
5. **Africa's Talking + MNO credentials.** `secrets.tf` provisions empty Secrets Manager entries (see `terraform output manual_secrets_to_populate`) — once real accounts/keys exist, populate each with:
   ```
   aws secretsmanager put-secret-value --secret-id <name> --secret-string <value>
   ```
   Terraform's `ignore_changes` on these means a later `apply` won't stomp on values entered this way.

## Applying

```
cd infra/aws
terraform init
terraform plan -var="container_image=<ecr_repo_url>:<tag>" -var="acm_certificate_arn=<arn>"
terraform apply -var="container_image=<ecr_repo_url>:<tag>" -var="acm_certificate_arn=<arn>"
```

Or copy `terraform.tfvars.example` to `terraform.tfvars` (gitignored, per the root `.gitignore`'s new Terraform section) and fill in real values there instead of `-var` flags.

## After applying

- Point the MNO-callback-facing domain's DNS at `terraform output alb_dns_name`.
- Update each MNO provider's dashboard/config with the real callback URL (`https://<domain>/api/v1/payments/callback/:provider`) — currently pointed nowhere, since no sandbox credentials exist yet (`specs/payments/design.md`'s Per-Provider Notes).
- Run `backend/src/database/migrations` against the new RDS instance (`npm run migration:run` with `DB_HOST`/etc. pointed at `terraform output rds_endpoint`) before the ECS service's first real request — a fresh RDS instance has no schema.
- Re-run `backend/scripts/load-test-stock-lock.ts` (`specs/hardening/design.md`'s Load Test section) against the real deployed endpoint, not just localhost, before calling this production-ready.
