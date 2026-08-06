output "alb_dns_name" {
  description = "Point the domain's DNS (and MNO callback URL config, once real) at this."
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "Push images here; reference the pushed tag as var.container_image."
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.backend.name
}

output "manual_secrets_to_populate" {
  description = "Secrets Manager entries Terraform created empty (secrets.tf) — real values must be entered via `aws secretsmanager put-secret-value` once these accounts exist. See README.md."
  value       = [for s in aws_secretsmanager_secret.manual : s.name]
}
