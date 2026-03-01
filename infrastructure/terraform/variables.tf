variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "rajutechie-streamkit"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC flow logs"
  type        = bool
  default     = true
}

variable "flow_log_retention_days" {
  description = "Number of days to retain VPC flow logs"
  type        = number
  default     = 30
}

# EKS Variables
variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS managed node group"
  type        = list(string)
  default     = ["t3.large"]
}

variable "eks_node_min_size" {
  description = "Minimum number of nodes in the EKS node group"
  type        = number
  default     = 2
}

variable "eks_node_max_size" {
  description = "Maximum number of nodes in the EKS node group"
  type        = number
  default     = 10
}

variable "eks_node_desired_size" {
  description = "Desired number of nodes in the EKS node group"
  type        = number
  default     = 3
}

variable "eks_node_disk_size" {
  description = "Disk size in GiB for EKS worker nodes"
  type        = number
  default     = 50
}

# RDS Variables
variable "rds_instance_class" {
  description = "Instance class for the RDS PostgreSQL instance"
  type        = string
  default     = "db.r6g.large"
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.2"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GiB"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "Maximum storage for RDS autoscaling in GiB"
  type        = number
  default     = 500
}

variable "rds_db_name" {
  description = "Name of the initial database"
  type        = string
  default     = "rajutechie-streamkit"
}

variable "rds_db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "rajutechie-streamkit_admin"
  sensitive   = true
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "rds_backup_retention_period" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 7
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = true
}

# Redis Variables
variable "redis_node_type" {
  description = "Node type for ElastiCache Redis"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_node_groups" {
  description = "Number of node groups (shards) for Redis cluster"
  type        = number
  default     = 3
}

variable "redis_replicas_per_node_group" {
  description = "Number of replica nodes per shard"
  type        = number
  default     = 1
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 7
}

# Kafka Variables
variable "kafka_broker_instance_type" {
  description = "Instance type for MSK broker nodes"
  type        = string
  default     = "kafka.m5.large"
}

variable "kafka_number_of_brokers" {
  description = "Number of MSK broker nodes"
  type        = number
  default     = 3
}

variable "kafka_version" {
  description = "Apache Kafka version for MSK"
  type        = string
  default     = "3.6.0"
}

variable "kafka_ebs_volume_size" {
  description = "EBS volume size per broker in GiB"
  type        = number
  default     = 100
}

variable "kafka_log_retention_days" {
  description = "Number of days to retain Kafka broker logs in CloudWatch"
  type        = number
  default     = 14
}

# S3 Variables
variable "s3_force_destroy" {
  description = "Allow force destruction of S3 buckets (for non-production)"
  type        = bool
  default     = false
}

variable "s3_media_lifecycle_glacier_days" {
  description = "Days before media objects transition to Glacier"
  type        = number
  default     = 90
}

variable "s3_media_lifecycle_expiration_days" {
  description = "Days before media objects expire"
  type        = number
  default     = 365
}

variable "s3_recordings_lifecycle_glacier_days" {
  description = "Days before recording objects transition to Glacier"
  type        = number
  default     = 30
}

variable "s3_recordings_lifecycle_expiration_days" {
  description = "Days before recording objects expire"
  type        = number
  default     = 180
}

variable "s3_allowed_origins" {
  description = "Allowed origins for S3 CORS configuration"
  type        = list(string)
  default     = ["*"]
}

# Monitoring Variables
variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}

variable "monitoring_log_retention_days" {
  description = "Number of days to retain CloudWatch log groups"
  type        = number
  default     = 30
}

variable "monitoring_cpu_alarm_threshold" {
  description = "CPU utilization threshold for CloudWatch alarm (percentage)"
  type        = number
  default     = 80
}

variable "monitoring_memory_alarm_threshold" {
  description = "Memory utilization threshold for CloudWatch alarm (percentage)"
  type        = number
  default     = 80
}

variable "monitoring_error_rate_threshold" {
  description = "Error rate threshold for CloudWatch alarm (count per period)"
  type        = number
  default     = 50
}
