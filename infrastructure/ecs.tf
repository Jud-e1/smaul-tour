# ECS Cluster for backend services
resource "aws_ecs_cluster" "main" {
  name = "tourism-marketplace"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = { Environment = var.environment }
}

# ECR Repository
resource "aws_ecr_repository" "backend" {
  name                 = "tourism-marketplace/backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "tourism-marketplace-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" }
    ]
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.db_url.arn },
      { name = "REDIS_URL", valueFrom = aws_ssm_parameter.redis_url.arn },
      { name = "JWT_SECRET", valueFrom = aws_ssm_parameter.jwt_secret.arn },
      { name = "STRIPE_SECRET_KEY", valueFrom = aws_ssm_parameter.stripe_key.arn }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/tourism-marketplace/backend"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 40
    }
  }])
}

# ECS Service
resource "aws_ecs_service" "backend" {
  name            = "tourism-marketplace-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "tourism-marketplace-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# SSM Parameters for secrets
resource "aws_ssm_parameter" "db_url" {
  name  = "/tourism-marketplace/prod/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://dbadmin:${var.db_password}@${aws_db_instance.postgres.endpoint}/tourism_marketplace"
}

resource "aws_ssm_parameter" "redis_url" {
  name  = "/tourism-marketplace/prod/REDIS_URL"
  type  = "SecureString"
  value = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/tourism-marketplace/prod/JWT_SECRET"
  type  = "SecureString"
  value = "REPLACE_WITH_ACTUAL_SECRET"
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "stripe_key" {
  name  = "/tourism-marketplace/prod/STRIPE_SECRET_KEY"
  type  = "SecureString"
  value = "REPLACE_WITH_ACTUAL_STRIPE_KEY"
  lifecycle { ignore_changes = [value] }
}

# IAM Roles
resource "aws_iam_role" "ecs_execution" {
  name = "tourism-marketplace-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "tourism-marketplace-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}
