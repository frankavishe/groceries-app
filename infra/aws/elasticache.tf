resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis"
  subnet_ids = aws_subnet.private[*].id
}

# Single node, no cluster mode — matches infra/docker-compose.yml's local
# dev Redis (a single container). Redis here is OTP-attempt-counter storage
# only (specs/auth/design.md's OtpService), not a durability-critical store;
# losing it just means a handful of in-flight OTP sessions need retrying.
resource "aws_elasticache_cluster" "main" {
  cluster_id         = "${local.name_prefix}-redis"
  engine             = "redis"
  engine_version     = "7.1"
  node_type          = var.redis_node_type
  num_cache_nodes    = 1
  port               = 6379
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  tags = { Name = "${local.name_prefix}-redis" }
}
