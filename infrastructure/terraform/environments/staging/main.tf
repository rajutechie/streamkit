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
    key            = "environments/staging/terraform.tfstate"
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
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}

module "rajutechie-streamkit" {
  source = "../../"

  region       = "us-east-1"
  environment  = "staging"
  project_name = "rajutechie-streamkit"
  vpc_cidr     = "10.1.0.0/16"

  enable_vpc_flow_logs    = true
  flow_log_retention_days = 14

  # EKS - moderate sizing, multi-AZ
  eks_cluster_version     = "1.29"
  eks_node_instance_types = ["t3.large"]
  eks_node_min_size       = 2
  eks_node_max_size       = 6
  eks_node_desired_size   = 3
  eks_node_disk_size      = 50

  # RDS - moderate instance, multi-AZ enabled
  rds_instance_class          = "db.r6g.large"
  rds_engine_version          = "16.2"
  rds_allocated_storage       = 50
  rds_max_allocated_storage   = 200
  rds_db_name                 = "rajutechie-streamkit"
  rds_db_username             = "rajutechie-streamkit_admin"
  rds_multi_az                = true
  rds_backup_retention_period = 7
  rds_deletion_protection     = true

  # Redis - cluster mode with replicas
  redis_node_type             = "cache.r6g.large"
  redis_num_node_groups       = 2
  redis_replicas_per_node_group = 1
  redis_engine_version        = "7.1"
  redis_snapshot_retention_limit = 3

  # Kafka - moderate cluster
  kafka_broker_instance_type = "kafka.m5.large"
  kafka_number_of_brokers    = 3
  kafka_version              = "3.6.0"
  kafka_ebs_volume_size      = 50
  kafka_log_retention_days   = 7

  # S3 - moderate lifecycles, staging domain
  s3_force_destroy                     = false
  s3_media_lifecycle_glacier_days      = 60
  s3_media_lifecycle_expiration_days   = 180
  s3_recordings_lifecycle_glacier_days = 30
  s3_recordings_lifecycle_expiration_days = 120
  s3_allowed_origins                   = ["https://staging.rajutechie-streamkit.io"]

  # Monitoring - moderate thresholds
  alert_email                    = ""
  monitoring_log_retention_days  = 14
  monitoring_cpu_alarm_threshold    = 80
  monitoring_memory_alarm_threshold = 80
  monitoring_error_rate_threshold   = 50
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
