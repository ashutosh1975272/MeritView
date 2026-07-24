variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "meritview"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "encryption_key_1" {
  description = "Primary encryption key (base64)"
  type        = string
  sensitive   = true
}

variable "encryption_key_2" {
  description = "Secondary encryption key (base64)"
  type        = string
  sensitive   = true
}
