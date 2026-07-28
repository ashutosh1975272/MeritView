resource "aws_db_instance" "meritview" {
  identifier        = "${var.app_name}-${var.environment}"
  engine            = "postgres"
  engine_version    = "16.3"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_encrypted = true

  db_name  = "meritview"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.meritview.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection = true
  skip_final_snapshot = var.environment != "production"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  parameter_group_name = aws_db_parameter_group.meritview.name
}

resource "aws_db_parameter_group" "meritview" {
  name   = "${var.app_name}-${var.environment}-pg"
  family = "postgres16"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

resource "aws_db_subnet_group" "meritview" {
  name       = "${var.app_name}-${var.environment}-subnet-group"
  subnet_ids = var.private_subnet_ids
}
