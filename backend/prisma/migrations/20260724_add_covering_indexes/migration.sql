-- T5.3.1.2: Add covering indexes for admin dispute queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_admin_list
  ON disputes (state, category, created_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_admin_stats
  ON disputes (state, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evaluator_outputs_cost_agg
  ON evaluator_outputs (dispute_id, cost_usd, created_at);
