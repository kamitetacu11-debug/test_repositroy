'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
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
import { useCRMStore, useCRMHydration } from '@/stores/crm.store';
import { useSettingsStore } from '@/stores/settings.store';
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
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Custom styled number input with increment/decrement buttons
interface StyledNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  suffix?: string;
}

function StyledNumberInput({ value, onChange, min, max, placeholder, suffix }: StyledNumberInputProps) {
  const { getCurrentTheme } = useSettingsStore();
  const theme = getCurrentTheme();

  const handleIncrement = () => {
    const currentValue = parseFloat(value) || 0;
    const newValue = max !== undefined ? Math.min(currentValue + 1, max) : currentValue + 1;
    onChange(newValue.toString());
  };

  const handleDecrement = () => {
    const currentValue = parseFloat(value) || 0;
    const newValue = min !== undefined ? Math.max(currentValue - 1, min) : currentValue - 1;
    onChange(newValue.toString());
  };

  return (
    <div className="relative flex items-center">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        placeholder={placeholder}
        className="pr-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="absolute right-14 text-gray-400 text-sm">{suffix}</span>
      )}
      <div className="absolute right-1 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={handleIncrement}
          className="w-6 h-5 flex items-center justify-center rounded-t-md transition-all hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary}40, ${theme.colors.secondary}40)`,
            border: `1px solid ${theme.colors.primary}50`
          }}
        >
          <ChevronUp className="w-3 h-3 text-white" />
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          className="w-6 h-5 flex items-center justify-center rounded-b-md transition-all hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary}40, ${theme.colors.secondary}40)`,
            border: `1px solid ${theme.colors.primary}50`
          }}
        >
          <ChevronDown className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
}


interface DealFormData {
  title: string;
  customerId: string;
  pipelineId: string;
  stageId: string;
  amount: string;
  probability: string;
  expectedCloseDate: string;
  notes: string;
}

const initialFormData: DealFormData = {
  title: '',
  customerId: '',
  pipelineId: '',
  stageId: '',
  amount: '',
  probability: '',
  expectedCloseDate: '',
  notes: '',
};

export default function DealsPage() {
  const router = useRouter();
  const t = useTranslation();
  const hasHydrated = useCRMHydration();
  const { getCurrentTheme } = useSettingsStore();
  const theme = getCurrentTheme();

  // Get data from CRM store
  const { deals, pipelines, customers, addDeal, updateDeal, deleteDeal } = useCRMStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DealFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Filter deals
  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

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
  }, [deals, searchQuery, statusFilter, pipelineFilter]);

  const editingDeal = editingDealId
    ? deals.find(d => d.id === editingDealId)
    : null;

  // Get stages for selected pipeline in form
  const selectedPipelineStages = useMemo(() => {
    if (!formData.pipelineId) return [];
    const pipeline = pipelines.find(p => p.id === formData.pipelineId);
    return pipeline?.stages || [];
  }, [pipelines, formData.pipelineId]);

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.customerId || !formData.pipelineId || !formData.stageId) return;

    setSubmitting(true);

    const customer = customers.find(c => c.id === formData.customerId);
    const pipeline = pipelines.find(p => p.id === formData.pipelineId);
    const stage = pipeline?.stages.find(s => s.id === formData.stageId);

    if (!customer || !pipeline || !stage) {
      setSubmitting(false);
      return;
    }

    const dealData = {
      title: formData.title,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      probability: formData.probability ? parseInt(formData.probability) : stage.winProbability,
      expectedCloseDate: formData.expectedCloseDate || null,
      notes: formData.notes || null,
      status: stage.winProbability === 100 ? 'WON' as const : stage.winProbability === 0 ? 'LOST' as const : 'OPEN' as const,
      customer: { id: customer.id, name: customer.name },
      pipeline: { id: pipeline.id, name: pipeline.name },
      stage: { id: stage.id, name: stage.name, color: stage.color },
      assignedTo: null,
    };

    if (editingDealId) {
      updateDeal(editingDealId, dealData);
    } else {
      addDeal(dealData);
    }

    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingDealId(null);
    setSubmitting(false);
  };

  const handleEdit = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    setEditingDealId(dealId);
    setFormData({
      title: deal.title,
      customerId: deal.customer.id,
      pipelineId: deal.pipeline.id,
      stageId: deal.stage.id,
      amount: deal.amount?.toString() || '',
      probability: deal.probability?.toString() || '',
      expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split('T')[0] : '',
      notes: deal.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (dealId: string) => {
    if (!confirm(t.crm.confirmDelete)) return;
    deleteDeal(dealId);
  };

  const openNewDialog = () => {
    setEditingDealId(null);
    const defaultPipeline = pipelines[0];
    const defaultStages = defaultPipeline?.stages || [];
    const sortedStages = [...defaultStages].sort((a, b) => a.sortOrder - b.sortOrder);
    const defaultStage = sortedStages[0];

    setFormData({
      ...initialFormData,
      pipelineId: defaultPipeline?.id || '',
      stageId: defaultStage?.id || '',
    });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WON':
        return 'bg-green-500/20 text-green-500';
      case 'LOST':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-blue-500/20 text-blue-500';
    }
  };

  // Show loading until hydrated
  if (!hasHydrated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cosmic-purple" />
        </div>
      </DashboardLayout>
    );
  }

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
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t.crm.addDeal}
          </Button>
        </div>

        {/* Add/Edit Deal Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent
              className="max-w-2xl glass"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.background}f0 0%, ${theme.colors.background}e0 100%)`,
                borderColor: `${theme.colors.primary}40`,
                boxShadow: `0 0 40px ${theme.colors.glow1}, 0 0 80px ${theme.colors.glow2}`
              }}
            >
              <DialogHeader>
                <DialogTitle
                  className="text-xl"
                  style={{ color: theme.colors.primary }}
                >
                  {editingDeal ? t.crm.editDeal : t.crm.addNewDeal}
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
                      <SelectContent
                        className="glass"
                        style={{
                          background: `${theme.colors.background}f5`,
                          borderColor: `${theme.colors.primary}40`
                        }}
                      >
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.amount}</Label>
                    <StyledNumberInput
                      value={formData.amount}
                      onChange={(value) =>
                        setFormData({ ...formData, amount: value })
                      }
                      min={0}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.crm.pipeline} *</Label>
                    <Select
                      value={formData.pipelineId}
                      onValueChange={(value) => {
                        const selectedPipeline = pipelines.find(p => p.id === value);
                        const stages = selectedPipeline?.stages || [];
                        const sortedStages = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
                        const firstStage = sortedStages[0];
                        setFormData({
                          ...formData,
                          pipelineId: value,
                          stageId: firstStage?.id || ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.crm.selectPipeline} />
                      </SelectTrigger>
                      <SelectContent
                        className="glass"
                        style={{
                          background: `${theme.colors.background}f5`,
                          borderColor: `${theme.colors.primary}40`
                        }}
                      >
                        {pipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.stage} *</Label>
                    <Select
                      value={formData.stageId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, stageId: value })
                      }
                      disabled={!formData.pipelineId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.crm.selectStage} />
                      </SelectTrigger>
                      <SelectContent
                        className="glass"
                        style={{
                          background: `${theme.colors.background}f5`,
                          borderColor: `${theme.colors.primary}40`
                        }}
                      >
                        {selectedPipelineStages
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.crm.probability} (%)</Label>
                    <StyledNumberInput
                      value={formData.probability}
                      onChange={(value) =>
                        setFormData({ ...formData, probability: value })
                      }
                      min={0}
                      max={100}
                      placeholder="50"
                      suffix="%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.expectedCloseDate}</Label>
                    <DatePicker
                      value={formData.expectedCloseDate}
                      onChange={(value) =>
                        setFormData({ ...formData, expectedCloseDate: value })
                      }
                      placeholder={t.crm.selectDate || 'Select date'}
                      locale="en"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.crm.notes}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder={t.crm.additionalNotes}
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
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                    border: 'none'
                  }}
                >
                  {submitting
                    ? t.crm.saving
                    : editingDeal
                    ? t.crm.update
                    : t.crm.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">{t.crm.totalValue}</span>
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(deals.reduce((sum, d) => sum + (d.amount || 0), 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">{t.crm.openDeals}</span>
              </div>
              <div className="text-2xl font-bold mt-1">
                {deals.filter(d => d.status === 'OPEN').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-500">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">{t.crm.wonDeals}</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-500">
                {deals.filter(d => d.status === 'WON').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-500">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">{t.crm.lostDeals}</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-500">
                {deals.filter(d => d.status === 'LOST').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
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
                  <SelectValue placeholder={t.crm.status} />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">{t.crm.allStatuses}</SelectItem>
                  <SelectItem value="OPEN">{t.crm.open}</SelectItem>
                  <SelectItem value="WON">{t.crm.won}</SelectItem>
                  <SelectItem value="LOST">{t.crm.lost}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.crm.pipeline} />
                </SelectTrigger>
                <SelectContent align="end">
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
                  <TableHead>{t.crm.deal}</TableHead>
                  <TableHead>{t.crm.customer}</TableHead>
                  <TableHead>{t.crm.stage}</TableHead>
                  <TableHead>{t.crm.amount}</TableHead>
                  <TableHead>{t.crm.probability}</TableHead>
                  <TableHead>{t.crm.closeDate}</TableHead>
                  <TableHead>{t.crm.status}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t.crm.noDealsFound}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeals.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/crm/deals/${deal.id}`)
                      }
                    >
                      <TableCell>
                        <div className="font-medium">{deal.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {deal.pipeline.name}
                        </div>
                      </TableCell>
                      <TableCell>{deal.customer.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: deal.stage.color }}
                          />
                          {deal.stage.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {deal.amount ? formatCurrency(deal.amount) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          {deal.probability}%
                        </div>
                      </TableCell>
                      <TableCell>
                        {deal.expectedCloseDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(deal.expectedCloseDate)}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(deal.status)}>
                          {deal.status}
                        </Badge>
                      </TableCell>
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
                                handleEdit(deal.id);
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
