# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

# EKS Outputs
output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint for the EKS Kubernetes API server"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority" {
  description = "Base64 encoded certificate data for the EKS cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "ARN of the OIDC provider for EKS IRSA"
  value       = module.eks.oidc_provider_arn
}

output "eks_node_security_group_id" {
  description = "Security group ID attached to EKS worker nodes"
  value       = module.eks.node_security_group_id
}

# RDS Outputs
output "rds_endpoint" {
  description = "Connection endpoint for the RDS PostgreSQL instance"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "Port of the RDS PostgreSQL instance"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "Name of the default database"
  value       = module.rds.database_name
}

output "rds_master_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the RDS master password"
  value       = module.rds.master_password_secret_arn
}

# Redis Outputs
output "redis_primary_endpoint" {
  description = "Configuration endpoint for the Redis replication group"
  value       = module.redis.configuration_endpoint
}

output "redis_port" {
  description = "Port for the Redis cluster"
  value       = module.redis.port
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the Redis auth token"
  value       = module.redis.auth_token_secret_arn
}

# Kafka Outputs
output "kafka_bootstrap_brokers_tls" {
  description = "TLS connection host:port pairs for the MSK cluster"
  value       = module.kafka.bootstrap_brokers_tls
}

output "kafka_zookeeper_connect_string" {
  description = "Zookeeper connection string for the MSK cluster"
  value       = module.kafka.zookeeper_connect_string
}

output "kafka_cluster_arn" {
  description = "ARN of the MSK cluster"
  value       = module.kafka.cluster_arn
}

# S3 Outputs
output "s3_media_bucket_name" {
  description = "Name of the S3 bucket for media storage"
  value       = module.s3.media_bucket_name
}

output "s3_media_bucket_arn" {
  description = "ARN of the S3 bucket for media storage"
  value       = module.s3.media_bucket_arn
}

output "s3_recordings_bucket_name" {
  description = "Name of the S3 bucket for recordings"
  value       = module.s3.recordings_bucket_name
}

output "s3_recordings_bucket_arn" {
  description = "ARN of the S3 bucket for recordings"
  value       = module.s3.recordings_bucket_arn
}

# Monitoring Outputs
output "monitoring_sns_topic_arn" {
  description = "ARN of the SNS topic for CloudWatch alarms"
  value       = module.monitoring.sns_topic_arn
}

output "monitoring_dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = module.monitoring.dashboard_name
}
