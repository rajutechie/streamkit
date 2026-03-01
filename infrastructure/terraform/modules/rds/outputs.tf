output "instance_id" {
  description = "Identifier of the RDS instance"
  value       = aws_db_instance.main.identifier
}

output "instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "address" {
  description = "Hostname of the RDS instance"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "Port of the RDS instance"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Name of the default database"
  value       = aws_db_instance.main.db_name
}

output "master_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the master password"
  value       = aws_secretsmanager_secret.rds_password.arn
}

output "security_group_id" {
  description = "Security group ID of the RDS instance"
  value       = aws_security_group.rds.id
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for storage encryption"
  value       = aws_kms_key.rds.arn
}
