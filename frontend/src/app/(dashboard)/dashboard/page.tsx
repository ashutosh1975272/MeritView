'use client';

import { useAuthStore } from '@/stores/useAuthStore';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/StateBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  FileText, 
  User, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Scale
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: disputesRes, isLoading } = useQuery({
    queryKey: ['disputes', 'all'],
    queryFn: () => apiClient.getDisputes(),
  });

  const disputes = disputesRes?.data ?? [];
  
  // Calculate stats
  const totalDisputes = disputes.length;
  const completed = disputes.filter((d: any) => d.state === 'COMPLETED').length;
  const pendingAction = disputes.filter((d: any) => 
    d.state === 'AWAITING_COUNTERPARTY' || 
    d.state === 'PAYMENT_PENDING' || 
    d.state === 'AWAITING_BRIEFS' ||
    d.state === 'DRAFT'
  ).length;
  const underAnalysis = disputes.filter((d: any) => d.state === 'UNDER_ANALYSIS').length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.displayName || 'there'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your disputes and view opinions from AI analysis.
        </p>
      </div>

      {/* Stats Grid */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Disputes</p>
                  <p className="text-2xl font-bold">{totalDisputes}</p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Action</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingAction}</p>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Under Analysis</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{underAnalysis}</p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completed}</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/disputes/new">
          <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Create New Dispute</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start a new analysis starting from $99
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/disputes">
          <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">My Disputes</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    View and manage all your disputes
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/profile">
          <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                  <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Profile Settings</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your account and preferences
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Disputes */}
      <section aria-labelledby="recent-disputes-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="recent-disputes-heading" className="text-xl font-semibold">
            Recent Disputes
          </h2>
          <Link
            href="/dashboard/disputes"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        
        <Card>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : disputes.length === 0 ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-muted/50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No disputes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first dispute
              </p>
              <Link href="/dashboard/disputes/new" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4 mr-2" />
                Create your first dispute
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {disputes.slice(0, 3).map((d: any) => (
                <Link
                  key={d.id}
                  href={`/dashboard/disputes/${d.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{d.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Created {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StateBadge state={d.state} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Global Disclaimer */}
      <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/10">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-600 text-sm mb-1">
                Important Disclaimer
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-600">
                MeritView uses Artificial Intelligence to analyze disputes. The opinions, summaries, and analyses provided by this platform are for informational and decision-support purposes only. They do not constitute legal advice and should not be relied upon as a substitute for professional legal counsel.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
