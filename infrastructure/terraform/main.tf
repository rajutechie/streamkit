terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "rajutechie-streamkit-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rajutechie-streamkit-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  azs          = local.azs
  public_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 4, 0),
    cidrsubnet(var.vpc_cidr, 4, 1),
    cidrsubnet(var.vpc_cidr, 4, 2),
  ]
  private_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 4, 4),
    cidrsubnet(var.vpc_cidr, 4, 5),
    cidrsubnet(var.vpc_cidr, 4, 6),
  ]
  enable_flow_logs       = var.enable_vpc_flow_logs
  flow_log_retention_days = var.flow_log_retention_days
}

module "eks" {
  source = "./modules/eks"

  project_name         = var.project_name
  environment          = var.environment
  cluster_version      = var.eks_cluster_version
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  node_instance_types  = var.eks_node_instance_types
  node_min_size        = var.eks_node_min_size
  node_max_size        = var.eks_node_max_size
  node_desired_size    = var.eks_node_desired_size
  node_disk_size       = var.eks_node_disk_size
}

module "rds" {
  source = "./modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id
  instance_class     = var.rds_instance_class
  engine_version     = var.rds_engine_version
  allocated_storage  = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  db_name            = var.rds_db_name
  db_username        = var.rds_db_username
  multi_az           = var.rds_multi_az
  backup_retention_period = var.rds_backup_retention_period
  deletion_protection     = var.rds_deletion_protection
}

module "redis" {
  source = "./modules/redis"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id
  node_type          = var.redis_node_type
  num_node_groups    = var.redis_num_node_groups
  replicas_per_node_group = var.redis_replicas_per_node_group
  engine_version     = var.redis_engine_version
  snapshot_retention_limit = var.redis_snapshot_retention_limit
}

module "kafka" {
  source = "./modules/kafka"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id
  broker_instance_type = var.kafka_broker_instance_type
  number_of_brokers    = var.kafka_number_of_brokers
  kafka_version        = var.kafka_version
  ebs_volume_size      = var.kafka_ebs_volume_size
  log_retention_days   = var.kafka_log_retention_days
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
  force_destroy = var.s3_force_destroy
  media_lifecycle_glacier_days    = var.s3_media_lifecycle_glacier_days
  media_lifecycle_expiration_days = var.s3_media_lifecycle_expiration_days
  recordings_lifecycle_glacier_days    = var.s3_recordings_lifecycle_glacier_days
  recordings_lifecycle_expiration_days = var.s3_recordings_lifecycle_expiration_days
  allowed_origins = var.s3_allowed_origins
}

module "monitoring" {
  source = "./modules/monitoring"

  project_name       = var.project_name
  environment        = var.environment
  eks_cluster_name   = module.eks.cluster_name
  rds_instance_id    = module.rds.instance_id
  redis_cluster_id   = module.redis.replication_group_id
  msk_cluster_name   = module.kafka.cluster_name
  alert_email        = var.alert_email
  log_retention_days = var.monitoring_log_retention_days
  cpu_alarm_threshold    = var.monitoring_cpu_alarm_threshold
  memory_alarm_threshold = var.monitoring_memory_alarm_threshold
  error_rate_threshold   = var.monitoring_error_rate_threshold
}
