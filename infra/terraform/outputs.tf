output "app_url" {
  description = "Application URL"
  value       = "https://${var.environment}.meritview.app"
}

output "db_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.meritview.endpoint
}

output "db_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.meritview.port
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.meritview.primary_endpoint_address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_replication_group.meritview.port
}

output "s3_bucket_name" {
  description = "S3 bucket for opinion PDFs"
  value       = aws_s3_bucket.opinion_pdfs.bucket
}

output "ses_domain_identity" {
  description = "SES verified domain identity"
  value       = aws_ses_domain_identity.meritview.id
}

output "app_security_group_id" {
  description = "Security group ID for the application"
  value       = aws_security_group.app.id
}
