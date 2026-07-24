# Opinion Delivery Performance Benchmarks

## Target Metrics
| Metric | Target | Measured |
|--------|--------|----------|
| Opinion read latency (incl. decryption) | <200ms | TBD |
| PDF generation latency | <10s | TBD |
| Cache hit rate | >60% | TBD |
| SSE connection limit | 1000 concurrent | TBD |

## Optimizations Implemented
- **T6.3.1.1**: Opinion read latency profiling in `services/opinions/profiler.ts`
- **T6.3.1.2**: PDF generation latency profiling in `services/opinions/profiler.ts`
- **T6.3.1.3**: Async PDF generation queue in `jobs/pdf.worker.ts`
- **T6.3.1.4**: Cached opinion read queries in `services/opinions/cache.ts`
- **T6.3.1.7**: Frontend optimized opinion page render via `components/opinion/OptimizedOpinionPage.tsx`
- **T6.3.1.8**: PDF download progress indicator in `components/opinion/PdfDownloadButton.tsx`

## Test Methodology
1. Measure opinion read time for cached vs uncached requests
2. Measure PDF generation time with and without async queue
3. Measure SSE connection stability under load
4. Verify frontend page renders within 200ms on desktop and 500ms on mobile
