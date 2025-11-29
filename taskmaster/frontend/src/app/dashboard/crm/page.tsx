'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import {
  Users,
  Building2,
  DollarSign,
  Calendar,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  totalCustomers: number;
  openDeals: number;
  pipelineValue: number;
  upcomingActivities: number;
}

interface RecentDeal {
  id: string;
  title: string;
  customer: { id: string; name: string };
  stage: { id: string; name: string; color: string };
  amount: number | null;
  updatedAt: string;
}

interface StageStats {
  stageId: string;
  stageName: string;
  stageColor: string;
  count: number;
}

export default function CRMDashboardPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [dealsByStage, setDealsByStage] = useState<StageStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/v1/crm/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
        setRecentDeals(data.data.recentDeals || []);
        setDealsByStage(data.data.dealsByStage || []);
      }
    } catch (error) {
      console.error('Failed to fetch CRM dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">CRM</h1>
            <p className="text-muted-foreground">
              Manage customers, deals, and sales pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/crm/customers')}>
              <Users className="mr-2 h-4 w-4" />
              Customers
            </Button>
            <Button onClick={() => router.push('/dashboard/crm/deals')}>
              <Plus className="mr-2 h-4 w-4" />
              New Deal
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats?.totalCustomers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Deals</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats?.openDeals || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                In pipeline
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(stats?.pipelineValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total potential revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Activities</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats?.upcomingActivities || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Next 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Stages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pipeline Overview</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/crm/pipelines')}>
                View Pipeline
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {dealsByStage.map((stage) => (
                <div
                  key={stage.stageId}
                  className="flex-shrink-0 min-w-[150px] p-4 rounded-lg border"
                  style={{ borderLeftColor: stage.stageColor, borderLeftWidth: '4px' }}
                >
                  <div className="text-sm font-medium">{stage.stageName}</div>
                  <div className="text-2xl font-bold">{stage.count}</div>
                  <div className="text-xs text-muted-foreground">deals</div>
                </div>
              ))}
              {dealsByStage.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-8 w-full">
                  No pipeline data. Create a pipeline to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Deals</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/crm/deals')}>
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/crm/deals/${deal.id}`)}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{deal.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {deal.customer.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${deal.stage.color}20`,
                        borderColor: deal.stage.color,
                        color: deal.stage.color,
                      }}
                    >
                      {deal.stage.name}
                    </Badge>
                    {deal.amount && (
                      <div className="font-semibold">
                        {formatCurrency(deal.amount)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {recentDeals.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-8">
                  No deals yet. Create your first deal to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push('/dashboard/crm/customers')}
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-semibold">Customers</div>
                <div className="text-sm text-muted-foreground">
                  Manage customer accounts
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push('/dashboard/crm/deals')}
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-semibold">Deals</div>
                <div className="text-sm text-muted-foreground">
                  Track sales opportunities
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push('/dashboard/crm/pipelines')}
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-semibold">Pipelines</div>
                <div className="text-sm text-muted-foreground">
                  Manage sales pipelines
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
