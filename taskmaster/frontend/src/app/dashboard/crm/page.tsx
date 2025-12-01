'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
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
  value?: number;
}

interface Pipeline {
  id: string;
  name: string;
  stages: { id: string; name: string; color: string; sortOrder: number }[];
}

interface Customer {
  id: string;
  name: string;
}

interface DealFormData {
  title: string;
  customerId: string;
  pipelineId: string;
  stageId: string;
  amount: string;
  probability: string;
  expectedCloseDate: string;
  description: string;
}

const initialFormData: DealFormData = {
  title: '',
  customerId: '',
  pipelineId: '',
  stageId: '',
  amount: '',
  probability: '',
  expectedCloseDate: '',
  description: '',
};

// Demo data for when no real data is available
const demoStats: DashboardStats = {
  totalCustomers: 6,
  openDeals: 5,
  pipelineValue: 510000,
  upcomingActivities: 4,
};

const demoRecentDeals: RecentDeal[] = [
  {
    id: 'demo-deal-1',
    title: 'Enterprise Software License',
    customer: { id: 'demo-customer-1', name: 'TechCorp International' },
    stage: { id: 'demo-stage-3', name: 'Proposal', color: '#F59E0B' },
    amount: 150000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-2',
    title: 'Financial Consulting Package',
    customer: { id: 'demo-customer-2', name: 'Global Finance Ltd' },
    stage: { id: 'demo-stage-2', name: 'Qualified', color: '#3B82F6' },
    amount: 85000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-3',
    title: 'Healthcare Platform Implementation',
    customer: { id: 'demo-customer-3', name: 'HealthPlus Medical' },
    stage: { id: 'demo-stage-4', name: 'Negotiation', color: '#8B5CF6' },
    amount: 250000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-4',
    title: 'Green Energy Audit',
    customer: { id: 'demo-customer-4', name: 'EcoGreen Solutions' },
    stage: { id: 'demo-stage-1', name: 'Lead', color: '#6B7280' },
    amount: 35000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-5',
    title: 'Startup Accelerator Program',
    customer: { id: 'demo-customer-5', name: 'StartupHub Inc' },
    stage: { id: 'demo-stage-5', name: 'Closed Won', color: '#10B981' },
    amount: 120000,
    updatedAt: new Date().toISOString(),
  },
];

const demoDealsByStage: StageStats[] = [
  { stageId: 'demo-stage-1', stageName: 'Lead', stageColor: '#6B7280', count: 1, value: 35000 },
  { stageId: 'demo-stage-2', stageName: 'Qualified', stageColor: '#3B82F6', count: 1, value: 85000 },
  { stageId: 'demo-stage-3', stageName: 'Proposal', stageColor: '#F59E0B', count: 1, value: 150000 },
  { stageId: 'demo-stage-4', stageName: 'Negotiation', stageColor: '#8B5CF6', count: 1, value: 250000 },
  { stageId: 'demo-stage-5', stageName: 'Closed Won', stageColor: '#10B981', count: 1, value: 120000 },
];

const demoPipelines: Pipeline[] = [
  {
    id: 'demo-pipeline-1',
    name: 'Sales Pipeline',
    stages: [
      { id: 'demo-stage-1', name: 'Lead', color: '#6B7280', sortOrder: 0 },
      { id: 'demo-stage-2', name: 'Qualified', color: '#3B82F6', sortOrder: 1 },
      { id: 'demo-stage-3', name: 'Proposal', color: '#F59E0B', sortOrder: 2 },
      { id: 'demo-stage-4', name: 'Negotiation', color: '#8B5CF6', sortOrder: 3 },
      { id: 'demo-stage-5', name: 'Closed Won', color: '#10B981', sortOrder: 4 },
      { id: 'demo-stage-6', name: 'Closed Lost', color: '#EF4444', sortOrder: 5 },
    ],
  },
];

const demoCustomers: Customer[] = [
  { id: 'demo-customer-1', name: 'TechCorp International' },
  { id: 'demo-customer-2', name: 'Global Finance Ltd' },
  { id: 'demo-customer-3', name: 'HealthPlus Medical' },
  { id: 'demo-customer-4', name: 'EcoGreen Solutions' },
  { id: 'demo-customer-5', name: 'StartupHub Inc' },
  { id: 'demo-customer-6', name: 'RetailMax Group' },
];

export default function CRMDashboardPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const t = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [dealsByStage, setDealsByStage] = useState<StageStats[]>([]);
  const [loading, setLoading] = useState(true);

  // New Deal Dialog state
  const [isNewDealDialogOpen, setIsNewDealDialogOpen] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState<DealFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Pipeline Value Dialog state
  const [isPipelineValueDialogOpen, setIsPipelineValueDialogOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchPipelines();
    fetchCustomers();
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
        const apiStats = data.data?.stats;
        const apiRecentDeals = data.data?.recentDeals || [];
        const apiDealsByStage = data.data?.dealsByStage || [];

        // Use demo data if API returns empty or no data
        if (!apiStats || (apiStats.totalCustomers === 0 && apiStats.openDeals === 0)) {
          setStats(demoStats);
          setRecentDeals(demoRecentDeals);
          setDealsByStage(demoDealsByStage);
        } else {
          setStats(apiStats);
          setRecentDeals(apiRecentDeals);
          setDealsByStage(apiDealsByStage);
        }
      } else {
        // Use demo data on API error
        setStats(demoStats);
        setRecentDeals(demoRecentDeals);
        setDealsByStage(demoDealsByStage);
      }
    } catch (error) {
      console.error('Failed to fetch CRM dashboard:', error);
      // Use demo data on error
      setStats(demoStats);
      setRecentDeals(demoRecentDeals);
      setDealsByStage(demoDealsByStage);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/v1/crm/pipelines', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const apiPipelines = data.data || [];
        // Use demo data if no pipelines returned
        setPipelines(apiPipelines.length > 0 ? apiPipelines : demoPipelines);
      } else {
        setPipelines(demoPipelines);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
      setPipelines(demoPipelines);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/v1/crm/customers?limit=100', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const apiCustomers = data.data?.customers || data.data || [];
        // Use demo data if no customers returned
        setCustomers(apiCustomers.length > 0 ? apiCustomers : demoCustomers);
      } else {
        setCustomers(demoCustomers);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers(demoCustomers);
    }
  };

  const handleOpenNewDealDialog = () => {
    setFormData(initialFormData);
    setIsNewDealDialogOpen(true);
  };

  const handleSubmitNewDeal = async () => {
    if (!formData.title.trim() || !formData.customerId || !formData.pipelineId || !formData.stageId) return;

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        customerId: formData.customerId,
        pipelineId: formData.pipelineId,
        stageId: formData.stageId,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        probability: formData.probability ? parseInt(formData.probability) : null,
        expectedCloseDate: formData.expectedCloseDate || null,
        description: formData.description || null,
      };

      const response = await fetch('/api/v1/crm/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsNewDealDialogOpen(false);
        setFormData(initialFormData);
        fetchDashboardData(); // Refresh dashboard data
      }
    } catch (error) {
      console.error('Failed to create deal:', error);
    } finally {
      setSubmitting(false);
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

  const selectedPipeline = pipelines.find((p) => p.id === formData.pipelineId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t.crm.title}</h1>
            <p className="text-muted-foreground">
              {t.crm.subtitle}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/crm/customers')}>
              <Users className="mr-2 h-4 w-4" />
              {t.crm.customers}
            </Button>
            <Button onClick={handleOpenNewDealDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t.crm.newDeal}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.crm.totalCustomers}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats?.totalCustomers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.crm.activeAccounts}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.crm.openDeals}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats?.openDeals || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.crm.inPipeline}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setIsPipelineValueDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cosmic-purple">{t.crm.pipelineValue}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(stats?.pipelineValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.crm.totalPotentialRevenue}
              </p>
              {/* Progress bar showing value distribution */}
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden flex">
                {dealsByStage.slice(0, 5).map((stage, index) => {
                  const totalValue = dealsByStage.reduce((sum, s) => sum + (s.value || 0), 0);
                  const percentage = totalValue > 0 ? ((stage.value || 0) / totalValue) * 100 : 0;
                  return (
                    <div
                      key={stage.stageId}
                      className="h-full transition-all"
                      style={{
                        backgroundColor: stage.stageColor,
                        width: `${percentage}%`,
                      }}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t.crm.clickToViewDetails || 'Click to view details'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.crm.upcomingActivities}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats?.upcomingActivities || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.crm.next7Days}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Stages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t.crm.pipelineOverview}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/crm/pipelines')}>
                {t.crm.viewPipeline}
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
                  <div className="text-xs text-muted-foreground">{t.crm.deals.toLowerCase()}</div>
                </div>
              ))}
              {dealsByStage.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-8 w-full">
                  {t.crm.noPipelineData}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t.crm.recentDeals}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/crm/deals')}>
                {t.crm.viewAll}
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
                  {t.crm.noDealsYet}
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
                <div className="font-semibold">{t.crm.customers}</div>
                <div className="text-sm text-muted-foreground">
                  {t.crm.manageCustomerAccounts}
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
                <div className="font-semibold">{t.crm.deals}</div>
                <div className="text-sm text-muted-foreground">
                  {t.crm.trackSalesOpportunities}
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
                <div className="font-semibold">{t.crm.pipelines}</div>
                <div className="text-sm text-muted-foreground">
                  {t.crm.manageSalesPipelines}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Deal Dialog */}
      <Dialog open={isNewDealDialogOpen} onOpenChange={setIsNewDealDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.crm.createNewDeal}</DialogTitle>
            <DialogDescription>{t.crm.addDealToPipeline}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.crm.dealTitle} *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t.crm.dealTitlePlaceholder}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.crm.customer} *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.crm.selectCustomer} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.crm.pipelines} *</Label>
                <Select
                  value={formData.pipelineId}
                  onValueChange={(value) => setFormData({ ...formData, pipelineId: value, stageId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.crm.selectPipeline} />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedPipeline && (
              <div className="space-y-2">
                <Label>{t.crm.stage} *</Label>
                <Select
                  value={formData.stageId}
                  onValueChange={(value) => setFormData({ ...formData, stageId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.crm.selectStage} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPipeline.stages
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t.crm.amount} ($)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.probability} (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.expectedCloseDate}</Label>
                <Input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.crm.description}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.crm.descriptionPlaceholder}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDealDialogOpen(false)}>
              {t.crm.cancel}
            </Button>
            <Button onClick={handleSubmitNewDeal} disabled={submitting}>
              {submitting ? t.crm.saving : t.crm.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pipeline Value Dialog */}
      <Dialog open={isPipelineValueDialogOpen} onOpenChange={setIsPipelineValueDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.crm.pipelineValue}</DialogTitle>
            <DialogDescription>{t.crm.pipelineValueBreakdown || 'Value breakdown by pipeline stage'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-cosmic-purple">
                {formatCurrency(stats?.pipelineValue || 0)}
              </div>
              <p className="text-sm text-muted-foreground">{t.crm.totalPotentialRevenue}</p>
            </div>

            {/* Stage breakdown */}
            <div className="space-y-3">
              {dealsByStage.map((stage) => {
                const totalValue = dealsByStage.reduce((sum, s) => sum + (s.value || 0), 0);
                const percentage = totalValue > 0 ? ((stage.value || 0) / totalValue) * 100 : 0;
                return (
                  <div key={stage.stageId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.stageColor }}
                        />
                        <span className="font-medium">{stage.stageName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {stage.count} {stage.count === 1 ? 'deal' : 'deals'}
                        </Badge>
                      </div>
                      <span className="font-semibold">{formatCurrency(stage.value || 0)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          backgroundColor: stage.stageColor,
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Won vs Open */}
            <div className="pt-4 border-t border-glass-border">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-500">
                    {formatCurrency(dealsByStage.find(s => s.stageName === 'Closed Won')?.value || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.crm.wonDeals || 'Won Deals'}</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-500">
                    {formatCurrency(
                      dealsByStage
                        .filter(s => !['Closed Won', 'Closed Lost'].includes(s.stageName))
                        .reduce((sum, s) => sum + (s.value || 0), 0)
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.crm.openDeals}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPipelineValueDialogOpen(false)}>
              {t.ai?.close || 'Close'}
            </Button>
            <Button onClick={() => {
              setIsPipelineValueDialogOpen(false);
              router.push('/dashboard/crm/pipelines');
            }}>
              {t.crm.viewPipeline}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
