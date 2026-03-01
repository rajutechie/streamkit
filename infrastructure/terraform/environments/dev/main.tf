terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  backend "s3" {
    bucket         = "rajutechie-streamkit-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rajutechie-streamkit-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "rajutechie-streamkit"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

module "rajutechie-streamkit" {
  source = "../../"

  region       = "us-east-1"
  environment  = "dev"
  project_name = "rajutechie-streamkit"
  vpc_cidr     = "10.0.0.0/16"

  enable_vpc_flow_logs    = true
  flow_log_retention_days = 7

  # EKS - smaller for dev, single node type
  eks_cluster_version     = "1.29"
  eks_node_instance_types = ["t3.medium"]
  eks_node_min_size       = 1
  eks_node_max_size       = 4
  eks_node_desired_size   = 2
  eks_node_disk_size      = 30

  # RDS - smaller instance, single-AZ, no deletion protection
  rds_instance_class          = "db.t4g.medium"
  rds_engine_version          = "16.2"
  rds_allocated_storage       = 20
  rds_max_allocated_storage   = 100
  rds_db_name                 = "rajutechie-streamkit"
  rds_db_username             = "rajutechie-streamkit_admin"
  rds_multi_az                = false
  rds_backup_retention_period = 3
  rds_deletion_protection     = false

  # Redis - minimal cluster for dev
  redis_node_type             = "cache.t4g.medium"
  redis_num_node_groups       = 1
  redis_replicas_per_node_group = 0
  redis_engine_version        = "7.1"
  redis_snapshot_retention_limit = 1

  # Kafka - smallest viable cluster
  kafka_broker_instance_type = "kafka.t3.small"
  kafka_number_of_brokers    = 3
  kafka_version              = "3.6.0"
  kafka_ebs_volume_size      = 20
  kafka_log_retention_days   = 3

  # S3 - allow force destroy in dev, shorter lifecycles
  s3_force_destroy                     = true
  s3_media_lifecycle_glacier_days      = 30
  s3_media_lifecycle_expiration_days   = 90
  s3_recordings_lifecycle_glacier_days = 14
  s3_recordings_lifecycle_expiration_days = 60
  s3_allowed_origins                   = ["http://localhost:*", "https://dev.rajutechie-streamkit.io"]

  # Monitoring - relaxed thresholds, short retention
  alert_email                    = ""
  monitoring_log_retention_days  = 7
  monitoring_cpu_alarm_threshold    = 90
  monitoring_memory_alarm_threshold = 90
  monitoring_error_rate_threshold   = 100
}

output "vpc_id" {
  value = module.rajutechie-streamkit.vpc_id
}

output "eks_cluster_endpoint" {
  value = module.rajutechie-streamkit.eks_cluster_endpoint
}

output "eks_cluster_name" {
  value = module.rajutechie-streamkit.eks_cluster_name
}

output "rds_endpoint" {
  value = module.rajutechie-streamkit.rds_endpoint
}

output "redis_primary_endpoint" {
  value = module.rajutechie-streamkit.redis_primary_endpoint
}

output "kafka_bootstrap_brokers_tls" {
  value = module.rajutechie-streamkit.kafka_bootstrap_brokers_tls
}

output "s3_media_bucket_name" {
  value = module.rajutechie-streamkit.s3_media_bucket_name
}

output "s3_recordings_bucket_name" {
  value = module.rajutechie-streamkit.s3_recordings_bucket_name
}
