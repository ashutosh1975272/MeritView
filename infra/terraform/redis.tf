resource "aws_elasticache_replication_group" "meritview" {
  replication_group_id          = "${var.app_name}-${var.environment}"
  description                   = "Redis cluster for MeritView ${var.environment}"
  node_type                     = var.redis_node_type
  num_cache_clusters            = var.redis_num_cache_nodes
  port                          = 6379
  parameter_group_name          = "default.redis7"
  automatic_failover_enabled    = var.redis_num_cache_nodes > 1
  multi_az_enabled              = var.redis_num_cache_nodes > 1
  transit_encryption_enabled    = true
  at_rest_encryption_enabled    = true
  auto_minor_version_upgrade    = true

  security_group_ids = [aws_security_group.redis.id]
  subnet_group_name  = aws_elasticache_subnet_group.meritview.name

  log_delivery_configuration {
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_group_name   = "/aws/elasticache/${var.app_name}-${var.environment}"
  }

  tags = {
    Name = "${var.app_name}-redis-${var.environment}"
  }
}

resource "aws_elasticache_subnet_group" "meritview" {
  name       = "${var.app_name}-${var.environment}-redis-subnet"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_parameter_group" "meritview" {
  name   = "${var.app_name}-${var.environment}-redis-params"
  family = "redis7"

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
}
