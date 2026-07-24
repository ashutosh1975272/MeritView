output "rds_endpoint" {
  description = "RDS instance endpoint"
  value = var.environment == "local" ? "localhost:5432" : aws_db_instance.main[0].address
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value = var.environment == "local" ? "localhost:6379" : aws_elasticache_replication_group.main[0].primary_endpoint_address
}

output "s3_opinion_pdfs_bucket" {
  description = "S3 bucket for opinion PDFs"
  value       = aws_s3_bucket.opinion_pdfs.id
}

output "ecs_service_role_arn" {
  description = "ECS service IAM role ARN"
  value       = aws_iam_role.ecs_service.arn
}

output "database_security_group_id" {
  description = "Database security group ID"
  value       = aws_security_group.database.id
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis.id
}
