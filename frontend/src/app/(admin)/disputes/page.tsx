'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StateBadge } from '@/components/StateBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, FileText } from 'lucide-react';

const STATES = ['DRAFT', 'AWAITING_BRIEFS', 'UNDER_ANALYSIS', 'COMPLETED', 'WITHDRAWN', 'DECLINED'];

export default function AdminDisputesPage() {
  const [stateFilter, setStateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'disputes', stateFilter, searchQuery, page],
    queryFn: () =>
      apiClient.adminGetDisputes({
        state: stateFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit,
      }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Disputes</h1>
          <p className="text-muted-foreground mt-1">Admin view of all disputes in the system.</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="search" className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title or summary..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2 w-48">
              <Label htmlFor="state-filter" className="text-sm font-medium">State</Label>
              <Select value={stateFilter} onValueChange={(value) => { setStateFilter(value === 'all' ? '' : (value || '')); setPage(1); }}>
                <SelectTrigger id="state-filter">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => { setStateFilter(''); setSearchQuery(''); setPage(1); }} className="gap-2">
              <Filter className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load disputes</p>
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && data.disputes.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No disputes found matching your filters.</p>
          </CardContent>
        </Card>
      )}

      {data && data.disputes.length > 0 && (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Title</th>
                    <th className="text-left px-4 py-3 font-medium">State</th>
                    <th className="text-left px-4 py-3 font-medium">Parties</th>
                    <th className="text-left px-4 py-3 font-medium">Evaluations</th>
                    <th className="text-left px-4 py-3 font-medium">Opinion</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.disputes.map((dispute: any) => (
                    <tr key={dispute.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/disputes/${dispute.id}`} className="font-medium hover:text-primary transition-colors max-w-[200px] block truncate">
                          {dispute.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><StateBadge state={dispute.state} /></td>
                      <td className="px-4 py-3">{dispute._count?.parties || 0}</td>
                      <td className="px-4 py-3">{dispute._count?.evaluatorOutputs || 0}</td>
                      <td className="px-4 py-3">
                        {dispute.opinion ? (
                          <Badge variant={dispute.opinion.deliveredAt ? 'default' : 'secondary'} className="text-xs">
                            {dispute.opinion.deliveredAt ? 'Published' : 'Draft'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/disputes/${dispute.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
