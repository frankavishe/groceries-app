resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}-backend"
  retention_in_days = 30 # pino's JSON lines (specs/hardening/design.md's Structured Logging section) land here — CloudWatch Logs Insights can query them directly since they're already structured.
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECS/Fargate over App Runner (constitution.md allows either) — this API
# runs a @nestjs/schedule cron (the 20-minute PENDING-order expiry,
# specs/orders/design.md) and a persistent Socket.IO gateway
# (specs/realtime/design.md), both wanting a long-lived, non-scale-to-zero
# process. See specs/hardening/design.md's AWS Deploy IaC section for the
# full reasoning.
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.container_image
      essential = true
      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment == "production" ? "production" : "development" },
        { name = "PORT", value = tostring(var.container_port) },
        { name = "DB_HOST", value = aws_db_instance.main.address },
        { name = "DB_PORT", value = tostring(aws_db_instance.main.port) },
        { name = "DB_USER", value = var.db_username },
        { name = "DB_NAME", value = var.db_name },
        { name = "REDIS_HOST", value = aws_elasticache_cluster.main.cache_nodes[0].address },
        { name = "REDIS_PORT", value = tostring(aws_elasticache_cluster.main.cache_nodes[0].port) },
        { name = "JWT_ACCESS_TOKEN_TTL", value = tostring(var.jwt_access_token_ttl_seconds) },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "AWS_S3_BUCKET", value = aws_s3_bucket.uploads.bucket },
        { name = "ADMIN_WEB_ORIGIN", value = coalesce(var.admin_web_origin, "") },
      ]
      # Every credential is injected from Secrets Manager at container
      # start, not as plaintext `environment` above — see secrets.tf.
      # AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY are deliberately absent: the
      # S3 SDK client picks up the task role's credentials automatically
      # (iam.tf) instead of needing static keys at all.
      secrets = concat(
        [
          { name = "DB_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn },
          { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
        ],
        [
          for key, envName in {
            "africas-talking-username" = "AFRICAS_TALKING_USERNAME"
            "africas-talking-api-key"  = "AFRICAS_TALKING_API_KEY"
            "mpesa-api-key"            = "MPESA_API_KEY"
            "mixx-yas-api-key"         = "MIXX_YAS_API_KEY"
            "airtel-money-api-key"     = "AIRTEL_MONEY_API_KEY"
          } : { name = envName, valueFrom = aws_secretsmanager_secret.manual[key].arn }
        ],
      )
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = { Name = "${local.name_prefix}-backend-task" }
}

resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.container_port
  }

  # Requires the HTTPS listener to exist first, same reasoning as
  # alb.tf's aws_lb_listener.https note.
  depends_on = [aws_lb_listener.https]

  tags = { Name = "${local.name_prefix}-backend-service" }
}
