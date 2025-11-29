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
    id: 'demo-1',
    title: 'Enterprise Platform License',
    customer: { id: 'c1', name: 'TechCorp Solutions' },
    stage: { id: 's1', name: 'Negotiation', color: '#d946ef' },
    amount: 150000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Inventory Management System',
    customer: { id: 'c2', name: 'Global Retail Group' },
    stage: { id: 's2', name: 'Proposal', color: '#a855f7' },
    amount: 85000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Healthcare Compliance Package',
    customer: { id: 'c3', name: 'HealthFirst Medical' },
    stage: { id: 's3', name: 'Qualified', color: '#8b5cf6' },
    amount: 200000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    title: 'Startup Growth Plan',
    customer: { id: 'c4', name: 'StartupHub Inc' },
    stage: { id: 's4', name: 'Lead', color: '#6366f1' },
    amount: 25000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    title: 'Educational Platform License',
    customer: { id: 'c5', name: 'EduTech Academy' },
    stage: { id: 's5', name: 'Proposal', color: '#a855f7' },
    amount: 45000,
    updatedAt: new Date().toISOString(),
  },
];

const demoDealsByStage: StageStats[] = [
  { stageId: 's1', stageName: 'Lead', stageColor: '#6366f1', count: 1 },
  { stageId: 's2', stageName: 'Qualified', stageColor: '#8b5cf6', count: 1 },
  { stageId: 's3', stageName: 'Proposal', stageColor: '#a855f7', count: 2 },
  { stageId: 's4', stageName: 'Negotiation', stageColor: '#d946ef', count: 1 },
  { stageId: 's5', stageName: 'Closed Won', stageColor: '#22c55e', count: 0 },
];

const demoPipelines: Pipeline[] = [
  {
    id: 'demo-pipeline-1',
    name: 'Sales Pipeline',
    stages: [
      { id: 'ds1', name: 'Lead', color: '#6366f1', sortOrder: 0 },
      { id: 'ds2', name: 'Qualified', color: '#8b5cf6', sortOrder: 1 },
      { id: 'ds3', name: 'Proposal', color: '#a855f7', sortOrder: 2 },
      { id: 'ds4', name: 'Negotiation', color: '#d946ef', sortOrder: 3 },
      { id: 'ds5', name: 'Closed Won', color: '#22c55e', sortOrder: 4 },
      { id: 'ds6', name: 'Closed Lost', color: '#ef4444', sortOrder: 5 },
    ],
  },
];

const demoCustomers: Customer[] = [
  { id: 'dc1', name: 'TechCorp Solutions' },
  { id: 'dc2', name: 'Global Retail Group' },
  { id: 'dc3', name: 'HealthFirst Medical' },
  { id: 'dc4', name: 'StartupHub Inc' },
  { id: 'dc5', name: 'John Williams' },
  { id: 'dc6', name: 'EduTech Academy' },
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.crm.pipelineValue}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(stats?.pipelineValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.crm.totalPotentialRevenue}
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
    </DashboardLayout>
  );
}
