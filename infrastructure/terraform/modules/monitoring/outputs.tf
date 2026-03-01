output "sns_topic_arn" {
  description = "ARN of the SNS topic for CloudWatch alarms"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_name" {
  description = "Name of the SNS topic for CloudWatch alarms"
  value       = aws_sns_topic.alerts.name
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "dashboard_arn" {
  description = "ARN of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_arn
}

output "log_group_names" {
  description = "Map of service names to their CloudWatch log group names"
  value       = { for k, v in aws_cloudwatch_log_group.services : k => v.name }
}

output "log_group_arns" {
  description = "Map of service names to their CloudWatch log group ARNs"
  value       = { for k, v in aws_cloudwatch_log_group.services : k => v.arn }
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for monitoring resources"
  value       = aws_kms_key.monitoring.arn
}

output "alarm_arns" {
  description = "Map of alarm names to their ARNs"
  value = merge(
    {
      eks_cpu_high     = aws_cloudwatch_metric_alarm.eks_cpu_high.arn
      eks_memory_high  = aws_cloudwatch_metric_alarm.eks_memory_high.arn
      rds_cpu_high     = aws_cloudwatch_metric_alarm.rds_cpu_high.arn
      rds_storage_low  = aws_cloudwatch_metric_alarm.rds_storage_low.arn
      rds_connections  = aws_cloudwatch_metric_alarm.rds_connections_high.arn
      redis_cpu_high   = aws_cloudwatch_metric_alarm.redis_cpu_high.arn
      redis_memory_high = aws_cloudwatch_metric_alarm.redis_memory_high.arn
    },
    { for k, v in aws_cloudwatch_metric_alarm.service_errors : "${k}_errors" => v.arn }
  )
}
