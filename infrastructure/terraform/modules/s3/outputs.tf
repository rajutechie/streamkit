output "media_bucket_name" {
  description = "Name of the media storage bucket"
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "ARN of the media storage bucket"
  value       = aws_s3_bucket.media.arn
}

output "media_bucket_domain_name" {
  description = "Bucket domain name for the media storage bucket"
  value       = aws_s3_bucket.media.bucket_domain_name
}

output "recordings_bucket_name" {
  description = "Name of the recordings storage bucket"
  value       = aws_s3_bucket.recordings.id
}

output "recordings_bucket_arn" {
  description = "ARN of the recordings storage bucket"
  value       = aws_s3_bucket.recordings.arn
}

output "recordings_bucket_domain_name" {
  description = "Bucket domain name for the recordings storage bucket"
  value       = aws_s3_bucket.recordings.bucket_domain_name
}

output "access_logs_bucket_name" {
  description = "Name of the S3 access logs bucket"
  value       = aws_s3_bucket.access_logs.id
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for S3 encryption"
  value       = aws_kms_key.s3.arn
}
