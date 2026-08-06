'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/StateBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, FileText, DollarSign, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminDisputeDetailPage() {
  const params = useParams();
  const disputeId = params.id as string;

  const { data: dispute, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'dispute', disputeId],
    queryFn: () => apiClient.adminGetDispute(disputeId),
    enabled: !!disputeId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
        <CardContent className="pt-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load dispute</p>
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
          <Link href="/admin/disputes">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to disputes
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!dispute) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/disputes" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Disputes
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{dispute.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{dispute.title}</h1>
            <StateBadge state={dispute.state} />
          </div>
          <p className="text-muted-foreground mt-2 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {new Date(dispute.createdAt).toLocaleDateString()}
            </span>
            {dispute.completedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Completed {new Date(dispute.completedAt).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Category</span>
              <span className="text-sm font-medium capitalize">{dispute.category?.replace(/_/g, ' ').toLowerCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Summary</span>
              <span className="text-sm text-right max-w-[60%]">{dispute.summary || 'No summary provided'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estimated Stakes</span>
              <span className="text-sm font-medium">{dispute.estimatedStakesUsd ? `$${Number(dispute.estimatedStakesUsd).toLocaleString()}` : 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-sm font-medium">${Number(dispute.priceUsd).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pricing Tier</span>
              <Badge variant="outline" className="capitalize">{dispute.pricingTier?.replace(/_/g, ' ').toLowerCase()}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parties</CardTitle>
          </CardHeader>
          <CardContent>
            {dispute.parties && dispute.parties.length > 0 ? (
              <div className="space-y-3">
                {dispute.parties.map((party: any) => (
                  <div key={party.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium capitalize">{party.role.toLowerCase()}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {party.userId ? `User: ${party.userId.substring(0, 8)}...` : 'No user'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No parties</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evaluator Outputs */}
      {dispute.evaluatorOutputs && dispute.evaluatorOutputs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evaluator Outputs ({dispute.evaluatorOutputs.length})</CardTitle>
            <CardDescription>Raw outputs from each AI evaluator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dispute.evaluatorOutputs.map((eo: any) => (
                <div key={eo.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm">{eo.llmProvider}</span>
                      <span className="text-muted-foreground text-xs ml-2">{eo.modelId}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>⏱ {eo.durationMs}ms</span>
                      <span>💰 ${Number(eo.costUsd).toFixed(4)}</span>
                      {eo.parseSuccess ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Parsed
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Parse Error
                        </span>
                      )}
                    </div>
                  </div>
                  <details>
                    <summary className="text-xs text-primary cursor-pointer hover:underline">View output</summary>
                    <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto max-h-60">
                      {JSON.stringify(eo.structuredOutput, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opinion */}
      {dispute.opinion && (
        <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="text-lg text-green-800 dark:text-green-400">Opinion</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-green-700 dark:text-green-500">Status</dt>
                <dd>
                  <Badge variant={dispute.opinion.deliveredAt ? 'default' : 'secondary'}>
                    {dispute.opinion.deliveredAt ? 'Published' : 'Draft'}
                  </Badge>
                </dd>
              </div>
              {dispute.opinion.deliveredAt && (
                <div className="flex items-center justify-between">
                  <dt className="text-green-700 dark:text-green-500">Delivered at</dt>
                  <dd>{new Date(dispute.opinion.deliveredAt).toLocaleString()}</dd>
                </div>
              )}
              {dispute.opinion.interEvaluatorAgreement && (
                <div className="flex items-center justify-between">
                  <dt className="text-green-700 dark:text-green-500">Agreement</dt>
                  <dd>{(Number(dispute.opinion.interEvaluatorAgreement) * 100).toFixed(1)}%</dd>
                </div>
              )}
              {dispute.opinion.overallConfidence && (
                <div className="flex items-center justify-between">
                  <dt className="text-green-700 dark:text-green-500">Confidence</dt>
                  <dd>{(Number(dispute.opinion.overallConfidence) * 100).toFixed(1)}%</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {dispute.payments && dispute.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dispute.payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">${Number(payment.amountUsd).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{payment.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
