# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/tourism-marketplace/backend"
  retention_in_days = 90
  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_log_group" "access_logs" {
  name              = "/tourism-marketplace/access-logs"
  retention_in_days = 90
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "api_response_time" {
  alarm_name          = "tourism-marketplace-api-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 2.0 # Alert when average response time > 2 seconds
  alarm_description   = "API average response time exceeds 2 seconds"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    LoadBalancer = aws_lb.backend.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "tourism-marketplace-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "High 5xx error rate detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    LoadBalancer = aws_lb.backend.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "tourism-marketplace-db-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database CPU utilization exceeds 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
}

resource "aws_cloudwatch_metric_alarm" "db_connections" {
  alarm_name          = "tourism-marketplace-db-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database connection count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "tourism-marketplace-alerts"
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "ops@tourismmarketplace.com"
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "TourismMarketplace"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title  = "API Response Time"
          metrics = [["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.backend.arn_suffix]]
          period = 60
          stat   = "Average"
        }
      },
      {
        type = "metric"
        properties = {
          title  = "Request Count"
          metrics = [["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.backend.arn_suffix]]
          period = 60
          stat   = "Sum"
        }
      },
      {
        type = "metric"
        properties = {
          title  = "Database CPU"
          metrics = [["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.postgres.id]]
          period = 300
          stat   = "Average"
        }
      },
      {
        type = "metric"
        properties = {
          title  = "Cache Hit Rate"
          metrics = [["AWS/ElastiCache", "CacheHitRate", "ReplicationGroupId", aws_elasticache_replication_group.redis.id]]
          period = 300
          stat   = "Average"
        }
      }
    ]
  })
}
