resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet"
  subnet_ids = var.environment == "production" ? aws_subnet.private[*].id : []

  tags = local.common_tags
}

resource "aws_elasticache_parameter_group" "main" {
  name        = "${local.name_prefix}-redis-params"
  family      = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = local.common_tags
}

resource "aws_elasticache_replication_group" "main" {
  count = var.environment == "local" ? 0 : 1

  replication_group_id = "${local.name_prefix}-redis"
  description          = "MeritView Redis cache"

  node_type            = var.environment == "production" ? "cache.t4g.small" : "cache.t4g.micro"
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  port                 = 6379

  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name

  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled           = var.environment == "production"

  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true

  security_group_ids = [aws_security_group.redis.id]

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-redis" })
}
