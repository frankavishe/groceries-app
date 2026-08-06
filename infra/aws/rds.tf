resource "random_password" "db" {
  length  = 32
  special = false # Postgres connection strings/URL-encoding friction; 32 random alphanumerics is already well beyond brute-force range.
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name_prefix}-db-subnet-group" }
}

# Postgres 16, matching infra/docker-compose.yml's local dev image
# (postgres:16-alpine) so migrations that pass locally behave identically.
resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage      = 20
  storage_type           = "gp3"
  storage_encrypted      = true
  db_name                = var.db_name
  username               = var.db_username
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period   = 7
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.name_prefix}-final" : null
  deletion_protection       = var.environment == "production"

  tags = { Name = "${local.name_prefix}-db" }
}
