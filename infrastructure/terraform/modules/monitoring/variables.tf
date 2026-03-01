variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "eks_cluster_name" {
  description = "Name of the EKS cluster for monitoring"
  type        = string
}

variable "rds_instance_id" {
  description = "Identifier of the RDS instance for monitoring"
  type        = string
}

variable "redis_cluster_id" {
  description = "ID of the ElastiCache Redis replication group for monitoring"
  type        = string
}

variable "msk_cluster_name" {
  description = "Name of the MSK cluster for monitoring"
  type        = string
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch log groups"
  type        = number
  default     = 30
}

variable "cpu_alarm_threshold" {
  description = "CPU utilization threshold for alarms (percentage)"
  type        = number
  default     = 80
}

variable "memory_alarm_threshold" {
  description = "Memory utilization threshold for alarms (percentage)"
  type        = number
  default     = 80
}

variable "error_rate_threshold" {
  description = "Error count threshold per 5-minute period for service alarms"
  type        = number
  default     = 50
}
