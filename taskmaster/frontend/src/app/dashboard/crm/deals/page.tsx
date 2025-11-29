'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Plus,
  Search,
  DollarSign,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Deal {
  id: string;
  title: string;
  amount: number | null;
  probability: number | null;
  expectedCloseDate: string | null;
  status: 'OPEN' | 'WON' | 'LOST';
  customer: { id: string; name: string };
  stage: { id: string; name: string; color: string };
  pipeline: { id: string; name: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
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

// Demo data for better UX when database is empty
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

const demoDeals: Deal[] = [
  {
    id: 'demo-deal-1',
    title: 'Enterprise Software License',
    amount: 150000,
    probability: 75,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    customer: { id: 'demo-customer-1', name: 'TechCorp International' },
    stage: { id: 'demo-stage-3', name: 'Proposal', color: '#F59E0B' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-deal-2',
    title: 'Financial Consulting Package',
    amount: 85000,
    probability: 60,
    expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    customer: { id: 'demo-customer-2', name: 'Global Finance Ltd' },
    stage: { id: 'demo-stage-2', name: 'Qualified', color: '#3B82F6' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-deal-3',
    title: 'Healthcare Platform Implementation',
    amount: 250000,
    probability: 90,
    expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    customer: { id: 'demo-customer-3', name: 'HealthPlus Medical' },
    stage: { id: 'demo-stage-4', name: 'Negotiation', color: '#8B5CF6' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-deal-4',
    title: 'Green Energy Audit',
    amount: 35000,
    probability: 40,
    expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    customer: { id: 'demo-customer-4', name: 'EcoGreen Solutions' },
    stage: { id: 'demo-stage-1', name: 'Lead', color: '#6B7280' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-deal-5',
    title: 'Startup Accelerator Program',
    amount: 120000,
    probability: 100,
    expectedCloseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'WON',
    customer: { id: 'demo-customer-5', name: 'StartupHub Inc' },
    stage: { id: 'demo-stage-5', name: 'Closed Won', color: '#10B981' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-deal-6',
    title: 'Retail POS System',
    amount: 45000,
    probability: 0,
    expectedCloseDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'LOST',
    customer: { id: 'demo-customer-6', name: 'RetailMax Group' },
    stage: { id: 'demo-stage-6', name: 'Closed Lost', color: '#EF4444' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function DealsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const t = useTranslation();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState<DealFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Function to filter demo data based on current filters
  const filterDemoDeals = (data: Deal[]) => {
    let filtered = [...data];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        d => d.title.toLowerCase().includes(query) ||
             d.customer.name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    if (pipelineFilter !== 'all') {
      filtered = filtered.filter(d => d.pipeline.id === pipelineFilter);
    }

    return filtered;
  };

  useEffect(() => {
    fetchDeals();
    fetchPipelines();
    fetchCustomers();
  }, [searchQuery, statusFilter, pipelineFilter]);

  const fetchDeals = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (pipelineFilter !== 'all') params.append('pipelineId', pipelineFilter);

      const response = await fetch(`/api/v1/crm/deals?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedDeals = data.data || [];

        // Use demo data if API returns empty
        if (fetchedDeals.length === 0) {
          // Always filter demo data based on current filters
          setDeals(filterDemoDeals(demoDeals));
        } else {
          setDeals(fetchedDeals);
        }
      } else {
        // Fallback to filtered demo data on error
        setDeals(filterDemoDeals(demoDeals));
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
      // Fallback to filtered demo data on error
      setDeals(filterDemoDeals(demoDeals));
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
        const fetchedPipelines = data.data || [];
        // Use demo data if API returns empty
        if (fetchedPipelines.length === 0) {
          setPipelines(demoPipelines);
        } else {
          setPipelines(fetchedPipelines);
        }
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
        const fetchedCustomers = data.data || [];
        // Use demo data if API returns empty
        if (fetchedCustomers.length === 0) {
          setCustomers(demoCustomers);
        } else {
          setCustomers(fetchedCustomers);
        }
      } else {
        setCustomers(demoCustomers);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers(demoCustomers);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.customerId || !formData.pipelineId || !formData.stageId) return;

    setSubmitting(true);
    try {
      const url = editingDeal
        ? `/api/v1/crm/deals/${editingDeal.id}`
        : '/api/v1/crm/deals';
      const method = editingDeal ? 'PUT' : 'POST';

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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setFormData(initialFormData);
        setEditingDeal(null);
        fetchDeals();
      }
    } catch (error) {
      console.error('Failed to save deal:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      customerId: deal.customer.id,
      pipelineId: deal.pipeline.id,
      stageId: deal.stage.id,
      amount: deal.amount?.toString() || '',
      probability: deal.probability?.toString() || '',
      expectedCloseDate: deal.expectedCloseDate?.split('T')[0] || '',
      description: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm(t.crm.confirmDelete)) return;

    try {
      const response = await fetch(`/api/v1/crm/deals/${dealId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchDeals();
      }
    } catch (error) {
      console.error('Failed to delete deal:', error);
    }
  };

  const openNewDialog = () => {
    setEditingDeal(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WON':
        return <Badge className="bg-green-500">{t.crm.won}</Badge>;
      case 'LOST':
        return <Badge variant="destructive">{t.crm.lost}</Badge>;
      default:
        return <Badge variant="secondary">{t.crm.open}</Badge>;
    }
  };

  const selectedPipeline = pipelines.find((p) => p.id === formData.pipelineId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/crm')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t.crm.dealsTitle}</h1>
              <p className="text-muted-foreground">
                {t.crm.dealsSubtitle}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/crm/pipelines')}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {t.crm.viewPipeline}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t.crm.newDeal}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingDeal ? t.crm.editDeal : t.crm.createNewDeal}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDeal
                      ? t.crm.updateDealInfo
                      : t.crm.addDealToPipeline}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>{t.crm.dealTitle} *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder={t.crm.dealTitlePlaceholder}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.crm.customer} *</Label>
                      <Select
                        value={formData.customerId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, customerId: value })
                        }
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
                        onValueChange={(value) =>
                          setFormData({ ...formData, pipelineId: value, stageId: '' })
                        }
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
                        onValueChange={(value) =>
                          setFormData({ ...formData, stageId: value })
                        }
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
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
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
                        onChange={(e) =>
                          setFormData({ ...formData, probability: e.target.value })
                        }
                        placeholder="50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.crm.expectedCloseDate}</Label>
                      <Input
                        type="date"
                        value={formData.expectedCloseDate}
                        onChange={(e) =>
                          setFormData({ ...formData, expectedCloseDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.description}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder={t.crm.descriptionPlaceholder}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    {t.crm.cancel}
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting
                      ? t.crm.saving
                      : editingDeal
                      ? t.crm.update
                      : t.crm.create}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t.crm.searchDeals}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t.tasks.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.crm.allStatuses}</SelectItem>
                  <SelectItem value="OPEN">{t.crm.open}</SelectItem>
                  <SelectItem value="WON">{t.crm.won}</SelectItem>
                  <SelectItem value="LOST">{t.crm.lost}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.crm.pipelines} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.crm.allPipelines}</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Deals Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.crm.deals}</TableHead>
                  <TableHead>{t.crm.customer}</TableHead>
                  <TableHead>{t.crm.stage}</TableHead>
                  <TableHead>{t.crm.amount}</TableHead>
                  <TableHead>{t.crm.probability}</TableHead>
                  <TableHead>{t.crm.expectedCloseDate}</TableHead>
                  <TableHead>{t.tasks.status}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {t.crm.loading}
                    </TableCell>
                  </TableRow>
                ) : deals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t.crm.noDealsFound}
                    </TableCell>
                  </TableRow>
                ) : (
                  deals.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/crm/deals/${deal.id}`)
                      }
                    >
                      <TableCell>
                        <div className="font-medium">{deal.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {deal.pipeline.name}
                        </div>
                      </TableCell>
                      <TableCell>{deal.customer.name}</TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        {deal.amount ? formatCurrency(deal.amount) : '-'}
                      </TableCell>
                      <TableCell>
                        {deal.probability !== null ? `${deal.probability}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {deal.expectedCloseDate
                          ? new Date(deal.expectedCloseDate).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(deal.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(deal);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t.crm.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(deal.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t.crm.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
