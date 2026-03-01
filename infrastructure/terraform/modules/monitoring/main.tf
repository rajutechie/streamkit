locals {
  services = [
    "api-gateway",
    "ws-gateway",
    "auth-service",
    "user-service",
    "chat-service",
    "call-service",
    "meeting-service",
    "stream-service",
    "notification-service",
    "presence-service",
    "media-service",
    "analytics-service",
    "moderation-service",
    "signaling-server",
  ]
}

# CloudWatch Log Groups for each service
resource "aws_cloudwatch_log_group" "services" {
  for_each = toset(local.services)

  name              = "/${var.project_name}/${var.environment}/${each.key}"
  retention_in_days = var.log_retention_days

  tags = {
    Name    = "${var.project_name}-${var.environment}-${each.key}-logs"
    Service = each.key
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name              = "${var.project_name}-${var.environment}-alerts"
  kms_master_key_id = aws_kms_key.monitoring.id

  tags = {
    Name = "${var.project_name}-${var.environment}-alerts-topic"
  }
}

resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.alerts.arn
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_kms_key" "monitoring" {
  description             = "KMS key for monitoring resources in ${var.project_name}-${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-${var.environment}-monitoring-kms"
  }
}

resource "aws_kms_alias" "monitoring" {
  name          = "alias/${var.project_name}-${var.environment}-monitoring"
  target_key_id = aws_kms_key.monitoring.key_id
}

# EKS Cluster CPU Alarm
resource "aws_cloudwatch_metric_alarm" "eks_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-eks-cpu-high"
  alarm_description   = "EKS cluster CPU utilization exceeds ${var.cpu_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  treat_missing_data  = "missing"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-eks-cpu-alarm"
  }
}

# EKS Cluster Memory Alarm
resource "aws_cloudwatch_metric_alarm" "eks_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-eks-memory-high"
  alarm_description   = "EKS cluster memory utilization exceeds ${var.memory_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold
  treat_missing_data  = "missing"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-eks-memory-alarm"
  }
}

# RDS CPU Alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  alarm_description   = "RDS CPU utilization exceeds ${var.cpu_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  treat_missing_data  = "missing"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-cpu-alarm"
  }
}

# RDS Free Storage Space Alarm
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-low"
  alarm_description   = "RDS free storage space is below 10 GiB"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240
  treat_missing_data  = "missing"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-storage-alarm"
  }
}

# RDS Connection Count Alarm
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-connections-high"
  alarm_description   = "RDS database connections exceed 100"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  treat_missing_data  = "missing"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-connections-alarm"
  }
}

# Redis CPU Alarm
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-high"
  alarm_description   = "Redis EngineCPUUtilization exceeds ${var.cpu_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  treat_missing_data  = "missing"

  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-cpu-alarm"
  }
}

# Redis Memory Alarm
resource "aws_cloudwatch_metric_alarm" "redis_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-high"
  alarm_description   = "Redis DatabaseMemoryUsagePercentage exceeds ${var.memory_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold
  treat_missing_data  = "missing"

  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-memory-alarm"
  }
}

# Application Error Rate Alarm (per service log group)
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  for_each = toset(local.services)

  name           = "${var.project_name}-${var.environment}-${each.key}-errors"
  log_group_name = aws_cloudwatch_log_group.services[each.key].name
  pattern        = "{ $.level = \"ERROR\" || $.level = \"error\" || $.level = \"FATAL\" }"

  metric_transformation {
    name          = "${each.key}-error-count"
    namespace     = "${var.project_name}/${var.environment}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "service_errors" {
  for_each = toset(local.services)

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-error-rate"
  alarm_description   = "Error rate for ${each.key} exceeds ${var.error_rate_threshold} in 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "${each.key}-error-count"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = var.error_rate_threshold
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "${var.project_name}-${var.environment}-${each.key}-error-alarm"
    Service = each.key
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# RajutechieStreamKit ${var.environment} Infrastructure Dashboard"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 12
        height = 6
        properties = {
          title   = "EKS Node CPU Utilization"
          metrics = [
            ["ContainerInsights", "node_cpu_utilization", "ClusterName", var.eks_cluster_name, { stat = "Average" }],
            ["...", { stat = "Maximum" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 1
        width  = 12
        height = 6
        properties = {
          title   = "EKS Node Memory Utilization"
          metrics = [
            ["ContainerInsights", "node_memory_utilization", "ClusterName", var.eks_cluster_name, { stat = "Average" }],
            ["...", { stat = "Maximum" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 8
        height = 6
        properties = {
          title   = "EKS Pod Count"
          metrics = [
            ["ContainerInsights", "pod_number_of_container_restarts", "ClusterName", var.eks_cluster_name, { stat = "Sum" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 7
        width  = 8
        height = 6
        properties = {
          title   = "EKS Network (Bytes)"
          metrics = [
            ["ContainerInsights", "node_network_total_bytes", "ClusterName", var.eks_cluster_name, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 7
        width  = 8
        height = 6
        properties = {
          title   = "EKS Filesystem Utilization"
          metrics = [
            ["ContainerInsights", "node_filesystem_utilization", "ClusterName", var.eks_cluster_name, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 13
        width  = 24
        height = 1
        properties = {
          markdown = "## Database (RDS PostgreSQL)"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 14
        width  = 8
        height = 6
        properties = {
          title   = "RDS CPU Utilization"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 14
        width  = 8
        height = 6
        properties = {
          title   = "RDS Database Connections"
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 14
        width  = 8
        height = 6
        properties = {
          title   = "RDS Free Storage Space (GiB)"
          metrics = [
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 20
        width  = 12
        height = 6
        properties = {
          title   = "RDS Read/Write Latency"
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Average" }],
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 20
        width  = 12
        height = 6
        properties = {
          title   = "RDS Read/Write IOPS"
          metrics = [
            ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Average" }],
            ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 26
        width  = 24
        height = 1
        properties = {
          markdown = "## Cache (ElastiCache Redis)"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 27
        width  = 8
        height = 6
        properties = {
          title   = "Redis EngineCPUUtilization"
          metrics = [
            ["AWS/ElastiCache", "EngineCPUUtilization", "ReplicationGroupId", var.redis_cluster_id, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 27
        width  = 8
        height = 6
        properties = {
          title   = "Redis Memory Usage (%)"
          metrics = [
            ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "ReplicationGroupId", var.redis_cluster_id, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 27
        width  = 8
        height = 6
        properties = {
          title   = "Redis Cache Hit Rate"
          metrics = [
            ["AWS/ElastiCache", "CacheHitRate", "ReplicationGroupId", var.redis_cluster_id, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 33
        width  = 12
        height = 6
        properties = {
          title   = "Redis Current Connections"
          metrics = [
            ["AWS/ElastiCache", "CurrConnections", "ReplicationGroupId", var.redis_cluster_id, { stat = "Sum" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 33
        width  = 12
        height = 6
        properties = {
          title   = "Redis Commands Processed"
          metrics = [
            ["AWS/ElastiCache", "GetTypeCmds", "ReplicationGroupId", var.redis_cluster_id, { stat = "Sum" }],
            ["AWS/ElastiCache", "SetTypeCmds", "ReplicationGroupId", var.redis_cluster_id, { stat = "Sum" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 39
        width  = 24
        height = 1
        properties = {
          markdown = "## Streaming (Amazon MSK)"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 40
        width  = 12
        height = 6
        properties = {
          title   = "MSK Broker CPU Utilization"
          metrics = [
            ["AWS/Kafka", "CpuUser", "Cluster Name", var.msk_cluster_name, { stat = "Average" }],
            ["AWS/Kafka", "CpuSystem", "Cluster Name", var.msk_cluster_name, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 40
        width  = 12
        height = 6
        properties = {
          title   = "MSK Disk Usage"
          metrics = [
            ["AWS/Kafka", "KafkaDataLogsDiskUsed", "Cluster Name", var.msk_cluster_name, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 46
        width  = 12
        height = 6
        properties = {
          title   = "MSK Messages In Per Second"
          metrics = [
            ["AWS/Kafka", "MessagesInPerSec", "Cluster Name", var.msk_cluster_name, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 46
        width  = 12
        height = 6
        properties = {
          title   = "MSK Bytes In/Out Per Second"
          metrics = [
            ["AWS/Kafka", "BytesInPerSec", "Cluster Name", var.msk_cluster_name, { stat = "Average" }],
            ["AWS/Kafka", "BytesOutPerSec", "Cluster Name", var.msk_cluster_name, { stat = "Average" }],
          ]
          period = 300
          view   = "timeSeries"
          region = data.aws_region.current.name
        }
      },
    ]
  })
}

data "aws_region" "current" {}
