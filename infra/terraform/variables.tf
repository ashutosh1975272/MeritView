variable "environment" {
  description = "Deployment environment (staging, production)"
  type        = string
  default     = "staging"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "meritview"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

variable "s3_bucket_name_prefix" {
  description = "Prefix for S3 bucket names"
  type        = string
  default     = "meritview"
}

variable "ses_domain" {
  description = "Domain configured in SES for email sending"
  type        = string
  default     = "meritview.app"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access application resources"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "vpc_id" {
  description = "VPC ID for security groups"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for database and Redis"
  type        = list(string)
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "meritview_admin"
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}
