variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "force_destroy" {
  description = "Allow force destruction of S3 buckets including all objects"
  type        = bool
  default     = false
}

variable "media_lifecycle_glacier_days" {
  description = "Days before media objects transition to Glacier"
  type        = number
  default     = 90
}

variable "media_lifecycle_expiration_days" {
  description = "Days before media objects expire and are deleted"
  type        = number
  default     = 365
}

variable "recordings_lifecycle_glacier_days" {
  description = "Days before recording objects transition to Glacier"
  type        = number
  default     = 30
}

variable "recordings_lifecycle_expiration_days" {
  description = "Days before recording objects expire and are deleted"
  type        = number
  default     = 180
}

variable "allowed_origins" {
  description = "Allowed origins for CORS configuration on media and recording buckets"
  type        = list(string)
  default     = ["*"]
}
