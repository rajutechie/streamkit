variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for the MSK security group"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for MSK broker nodes (must match number of AZs)"
  type        = list(string)
}

variable "eks_node_sg_id" {
  description = "Security group ID of EKS worker nodes for ingress rules"
  type        = string
}

variable "broker_instance_type" {
  description = "Instance type for MSK broker nodes"
  type        = string
  default     = "kafka.m5.large"
}

variable "number_of_brokers" {
  description = "Number of broker nodes in the MSK cluster"
  type        = number
  default     = 3
}

variable "kafka_version" {
  description = "Apache Kafka version"
  type        = string
  default     = "3.6.0"
}

variable "ebs_volume_size" {
  description = "EBS volume size per broker in GiB"
  type        = number
  default     = 100
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days for broker logs"
  type        = number
  default     = 14
}
