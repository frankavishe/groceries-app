# specs/hardening/design.md's AWS Deploy IaC section: every credential the
# ECS task needs is read from Secrets Manager at container start (ecs.tf's
# task definition `secrets` block), never baked into the image or passed as
# plaintext `environment`.

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "${local.name_prefix}/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}

# min(32) to satisfy backend/src/config/env.validation.ts's JWT_SECRET
# constraint (specs/hardening/design.md's security pass) — generated at 48
# chars, comfortably above that floor.
resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${local.name_prefix}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# --- Real third-party credentials: no code default exists to generate these
# --- (unlike db/jwt, which are ours to mint). Terraform provisions an empty
# --- secret *container* only; the actual value is entered post-apply via
# --- `aws secretsmanager put-secret-value` (see README.md), once the user
# --- actually has an Africa's Talking / MNO sandbox-or-production account —
# --- the exact gap specs/hardening/requirements.md's Scoping decision
# --- documents. `ignore_changes` so a later `terraform apply` never
# --- overwrites a value entered that way.
locals {
  manual_secrets = [
    "africas-talking-username",
    "africas-talking-api-key",
    "mpesa-api-key",
    "mixx-yas-api-key",
    "airtel-money-api-key",
  ]
}

resource "aws_secretsmanager_secret" "manual" {
  for_each = toset(local.manual_secrets)
  name     = "${local.name_prefix}/${each.value}"
}

resource "aws_secretsmanager_secret_version" "manual" {
  for_each      = toset(local.manual_secrets)
  secret_id     = aws_secretsmanager_secret.manual[each.value].id
  secret_string = "REPLACE_ME_POST_APPLY"

  lifecycle {
    ignore_changes = [secret_string]
  }
}
