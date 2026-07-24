# Evaluation Performance Benchmarks

## Target Metrics
| Metric | Target | Measured |
|--------|--------|----------|
| Provider dispatch latency (p95) | <5 min | TBD |
| Minimum successful evaluators | 3 of 3 | TBD |
| Cost per dispute | <$8.30 | TBD |
| Cache hit rate (brief content) | >50% | TBD |

## Optimization Implemented
- **T4.3.1.1**: Provider dispatch profiling via `/src/services/evaluation/profiler.ts`
- **T4.3.1.3**: Circuit breaker per provider (existing in `providers/circuit-breaker.ts`) — verified operational
- **T4.3.1.4**: Provider fallback routing in `services/evaluation/provider-fallback.ts`
- **T4.3.1.5**: Hash-based brief content caching in `services/evaluation/content-cache.ts`
- **T4.3.1.8**: Daily cost aggregation job in `jobs/cost-aggregation/job.ts`
- **T4.3.1.9**: Slack alert stub in `services/notifications/slack.ts`
- **T4.3.1.11**: Frontend optimistic status updates via hook `hooks/evaluation/useEvaluationStatus.ts`

## Test Methodology
1. Run evaluation against 5 test disputes
2. Measure time from dispatch to all 3 providers completing
3. Measure cache hit ratio by submitting identical brief twice
4. Measure cost per dispute from evaluator output records
5. Verify circuit breaker opens after configured failures
6. Verify fallback kicks in when primary provider fails
