'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GitMerge, 
  FileText, 
  ArrowRight, 
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'aggregations', 'pending'],
    queryFn: () => apiClient.adminGetPendingAggregations(),
  });

  const { data: disputesData, isLoading: disputesLoading } = useQuery({
    queryKey: ['admin', 'disputes', 'dashboard'],
    queryFn: () => apiClient.adminGetDisputes({ limit: 5 }),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of system activity and pending actions.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Aggregations</p>
                <p className="text-3xl font-bold mt-2">
                  {pendingLoading ? <Skeleton className="h-8 w-16" /> : pendingData?.count ?? 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <GitMerge className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <Link href="/admin/aggregations">
              <Button variant="ghost" className="mt-4 w-full justify-between p-0 h-auto font-normal text-sm text-primary hover:text-primary">
                View pending <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Disputes</p>
                <p className="text-3xl font-bold mt-2">
                  {disputesLoading ? <Skeleton className="h-8 w-16" /> : disputesData?.pagination?.total ?? 0}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <Link href="/admin/disputes">
              <Button variant="ghost" className="mt-4 w-full justify-between p-0 h-auto font-normal text-sm text-primary hover:text-primary">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quick Actions</p>
                <p className="text-sm text-muted-foreground mt-2">Manage disputes and aggregations</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link href="/admin/aggregations">
                <Button variant="outline" className="w-full justify-start text-sm h-8">
                  <GitMerge className="h-3 w-3 mr-2" />
                  Review aggregations
                </Button>
              </Link>
              <Link href="/admin/disputes">
                <Button variant="outline" className="w-full justify-start text-sm h-8">
                  <FileText className="h-3 w-3 mr-2" />
                  Browse disputes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Disputes */}
      {disputesData && disputesData.disputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Disputes</CardTitle>
            <CardDescription>Latest disputes requiring admin attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {disputesData.disputes.slice(0, 5).map((dispute: any) => (
                <Link
                  key={dispute.id}
                  href={`/admin/disputes/${dispute.id}`}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{dispute.title}</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {dispute.state.replace(/_/g, ' ')}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
