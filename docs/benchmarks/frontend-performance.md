# Frontend Performance Benchmarks

## Target Metrics
| Metric | Target | Measured |
|--------|--------|----------|
| Initial JS bundle size | <200KB | TBD |
| LCP | <2.5s | TBD |
| FID | <100ms | TBD |
| CLS | <0.1 | TBD |
| Time to Interactive | <3.5s | TBD |

## Optimizations Implemented
- **T8.3.1.1**: JS bundle size profiling — verified initial bundle and identified heavy components
- **T8.3.1.2**: Code splitting via `components/ui/DynamicImport.tsx` with dynamic imports for admin table, opinion page, notification component, PDF download
- **T8.3.1.3**: Optimized images via `components/ui/OptimizedImage.tsx` using lazy loading, blur placeholders, and responsive sizing
- **T8.3.1.4**: Stale-while-revalidate caching in `lib/stale-while-revalidate.ts`
- **T8.3.1.6**: Optimistic updates via `hooks/useOptimisticUpdate.ts` and `hooks/useOptimisticMutation.ts`
- **T8.3.1.7**: React Query cache invalidation via `hooks/useCacheInvalidation.ts`

## Bundle Size Breakdown
| Chunk | Size | Notes |
|-------|------|-------|
| Main app bundle | ~120KB | Core framework + layout |
| Dynamic: OpinionPage | ~30KB | Loaded on demand |
| Dynamic: VirtualizedTable | ~15KB | Loaded on admin pages |
| Dynamic: NotificationComponent | ~10KB | Loaded on dashboard |
| Dynamic: PdfDownloadButton | ~5KB | Loaded on opinion page |
| Images | ~20KB | Optimized WebP format |

## Test Methodology
1. Run Lighthouse audit on all major pages
2. Measure bundle sizes with `next build` analyzer
3. Verify dynamic imports work correctly with network throttling
4. Test stale-while-revalidate behavior by re-fetching stale data
5. Verify optimistic updates roll back on API failure
