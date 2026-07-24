resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = var.environment == "production" ? aws_subnet.private[*].id : []

  tags = local.common_tags
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name_prefix}-db-params"
  family = "postgres16"

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = local.common_tags
}

resource "aws_db_instance" "main" {
  count = var.environment == "local" ? 0 : 1

  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = var.environment == "production" ? "db.t4g.small" : "db.t4g.micro"

  allocated_storage     = var.environment == "production" ? 50 : 20
  storage_encrypted     = true
  storage_type          = "gp3"
  max_allocated_storage = 100

  db_name  = var.project_name
  username = "meritview"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  vpc_security_group_ids = [aws_security_group.database.id]

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-postgres" })
}
