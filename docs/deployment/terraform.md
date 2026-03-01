# Terraform Deployment

This guide covers provisioning RajutechieStreamKit infrastructure on AWS using the provided Terraform modules.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Module Overview](#module-overview)
- [Quick Start](#quick-start)
- [Module Reference](#module-reference)
- [Environment Configuration](#environment-configuration)
- [State Management](#state-management)
- [Operations](#operations)

---

## Prerequisites

- Terraform 1.5+
- AWS CLI configured with appropriate credentials
- An AWS account with permissions for VPC, EKS, RDS, ElastiCache, MSK, S3, CloudWatch

---

## Module Overview

```
infrastructure/terraform/
├── modules/
│   ├── vpc/           # VPC, subnets, NAT gateways
│   ├── eks/           # EKS cluster, node groups, IRSA
│   ├── rds/           # PostgreSQL RDS instance
│   ├── redis/         # ElastiCache Redis cluster
│   ├── kafka/         # Amazon MSK (Managed Kafka)
│   ├── s3/            # S3 buckets for media storage
│   └── monitoring/    # CloudWatch, Prometheus, Grafana
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── production/
└── main.tf
```

---

## Quick Start

### 1. Initialize

```bash
cd infrastructure/terraform/environments/dev
terraform init
```

### 2. Plan

```bash
terraform plan -var-file=terraform.tfvars
```

### 3. Apply

```bash
terraform apply -var-file=terraform.tfvars
```

### 4. Get Outputs

```bash
terraform output
# Displays: EKS endpoint, RDS endpoint, Redis endpoint, etc.
```

---

## Module Reference

### VPC Module

Creates a VPC with public and private subnets across multiple availability zones.

```hcl
module "vpc" {
  source = "../../modules/vpc"

  project_name       = "rajutechie-streamkit"
  environment        = "production"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets    = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = false  # One per AZ for HA
}
```

**Resources created:**
- VPC with DNS support
- Public and private subnets
- Internet gateway
- NAT gateways (one per AZ)
- Route tables

### EKS Module

Creates an EKS cluster with managed node groups.

```hcl
module "eks" {
  source = "../../modules/eks"

  project_name       = "rajutechie-streamkit"
  environment        = "production"
  cluster_version    = "1.29"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids

  node_groups = {
    general = {
      instance_types = ["t3.large"]
      min_size       = 3
      max_size       = 10
      desired_size   = 3
    }
    media = {
      instance_types = ["c5.2xlarge"]
      min_size       = 2
      max_size       = 8
      desired_size   = 2
      labels = {
        "rajutechie-streamkit.io/workload" = "media"
      }
      taints = [{
        key    = "media"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}
```

**Resources created:**
- EKS cluster with OIDC provider
- Managed node groups
- IAM roles for service accounts (IRSA)
- Cluster security group

### RDS Module

Creates a PostgreSQL RDS instance with Multi-AZ support.

```hcl
module "rds" {
  source = "../../modules/rds"

  project_name       = "rajutechie-streamkit"
  environment        = "production"
  engine_version     = "15.4"
  instance_class     = "db.r6g.large"
  allocated_storage  = 100
  max_storage        = 500
  multi_az           = true
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  allowed_cidr       = module.vpc.private_subnet_cidrs

  backup_retention_period = 7
  deletion_protection     = true
}
```

**Resources created:**
- RDS PostgreSQL instance
- DB subnet group
- Security group
- Parameter group
- Automated backups

### Redis Module

Creates an ElastiCache Redis cluster for caching, sessions, and pub/sub.

```hcl
module "redis" {
  source = "../../modules/redis"

  project_name     = "rajutechie-streamkit"
  environment      = "production"
  node_type        = "cache.r6g.large"
  num_cache_nodes  = 3
  engine_version   = "7.0"
  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  allowed_cidr     = module.vpc.private_subnet_cidrs

  cluster_mode_enabled = true
  replicas_per_shard   = 1
  num_shards           = 3
}
```

**Resources created:**
- ElastiCache Redis replication group
- Subnet group
- Security group
- Parameter group

### Kafka Module

Creates an Amazon MSK (Managed Streaming for Kafka) cluster.

```hcl
module "kafka" {
  source = "../../modules/kafka"

  project_name       = "rajutechie-streamkit"
  environment        = "production"
  kafka_version      = "3.5.1"
  broker_instance    = "kafka.m5.large"
  number_of_brokers  = 3
  ebs_volume_size    = 100
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  allowed_cidr       = module.vpc.private_subnet_cidrs

  encryption_in_transit = "TLS"
}
```

**Resources created:**
- MSK cluster
- Security group
- CloudWatch log group
- MSK configuration

### S3 Module

Creates S3 buckets for media storage, recordings, and backups.

```hcl
module "s3" {
  source = "../../modules/s3"

  project_name = "rajutechie-streamkit"
  environment  = "production"

  buckets = {
    media = {
      versioning = true
      lifecycle_rules = [{
        transition_days = 30
        storage_class   = "STANDARD_IA"
      }, {
        transition_days = 90
        storage_class   = "GLACIER"
      }]
    }
    recordings = {
      versioning = true
    }
    backups = {
      versioning      = true
      expiration_days  = 90
    }
  }

  cors_allowed_origins = ["https://app.rajutechie-streamkit.example.com"]
}
```

**Resources created:**
- S3 buckets with versioning
- Lifecycle policies
- CORS configuration
- Bucket policies
- CloudFront distribution (optional)

### Monitoring Module

Creates monitoring infrastructure with CloudWatch, Prometheus, and Grafana.

```hcl
module "monitoring" {
  source = "../../modules/monitoring"

  project_name  = "rajutechie-streamkit"
  environment   = "production"
  eks_cluster   = module.eks.cluster_name

  enable_prometheus  = true
  enable_grafana     = true
  enable_alerting    = true

  alert_email = "ops@example.com"

  dashboards = [
    "api-gateway",
    "websocket-connections",
    "media-pipeline",
    "database-performance",
  ]
}
```

**Resources created:**
- CloudWatch log groups
- CloudWatch dashboards
- SNS topics for alerting
- CloudWatch alarms
- Prometheus (via Helm on EKS)
- Grafana (via Helm on EKS)

---

## Environment Configuration

### Development (`environments/dev/terraform.tfvars`)

```hcl
project_name = "rajutechie-streamkit"
environment  = "dev"
region       = "us-east-1"

# Smaller instances for cost savings
eks_node_instance_type = "t3.medium"
eks_min_nodes          = 2
eks_max_nodes          = 4

rds_instance_class = "db.t3.medium"
rds_multi_az       = false

redis_node_type    = "cache.t3.medium"
redis_num_nodes    = 1

kafka_broker_instance = "kafka.t3.small"
kafka_num_brokers     = 2
```

### Production (`environments/production/terraform.tfvars`)

```hcl
project_name = "rajutechie-streamkit"
environment  = "production"
region       = "us-east-1"

eks_node_instance_type = "t3.large"
eks_min_nodes          = 3
eks_max_nodes          = 10

rds_instance_class      = "db.r6g.large"
rds_multi_az            = true
rds_deletion_protection = true

redis_node_type          = "cache.r6g.large"
redis_num_nodes          = 3
redis_cluster_mode       = true

kafka_broker_instance = "kafka.m5.large"
kafka_num_brokers     = 3
```

---

## State Management

### Remote State (Recommended)

Configure S3 backend for shared state:

```hcl
terraform {
  backend "s3" {
    bucket         = "rajutechie-streamkit-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rajutechie-streamkit-terraform-locks"
    encrypt        = true
  }
}
```

### Create State Resources

```bash
# Create S3 bucket for state
aws s3api create-bucket --bucket rajutechie-streamkit-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket rajutechie-streamkit-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name rajutechie-streamkit-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

---

## Operations

### Updating Infrastructure

```bash
# Preview changes
terraform plan -var-file=terraform.tfvars

# Apply changes
terraform apply -var-file=terraform.tfvars
```

### Destroying Infrastructure

```bash
# Destroy specific module
terraform destroy -target=module.monitoring -var-file=terraform.tfvars

# Destroy everything (use with caution)
terraform destroy -var-file=terraform.tfvars
```

### Importing Existing Resources

```bash
terraform import module.rds.aws_db_instance.main my-existing-rds-id
```

### Viewing Outputs

```bash
terraform output

# Specific output
terraform output eks_endpoint
terraform output rds_endpoint
terraform output redis_endpoint
```
