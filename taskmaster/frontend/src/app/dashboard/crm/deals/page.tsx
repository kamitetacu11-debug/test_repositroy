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
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
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

export default function DealsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
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
        setDeals(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
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
        setPipelines(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
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
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
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
    if (!confirm('Are you sure you want to delete this deal?')) return;

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
        return <Badge className="bg-green-500">Won</Badge>;
      case 'LOST':
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="secondary">Open</Badge>;
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
              <h1 className="text-3xl font-bold">Deals</h1>
              <p className="text-muted-foreground">
                Track your sales opportunities
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/crm/pipelines')}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Pipeline View
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Deal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingDeal ? 'Edit Deal' : 'Create New Deal'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDeal
                      ? 'Update deal information'
                      : 'Add a new deal to your pipeline'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Deal Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., Enterprise License Deal"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer *</Label>
                      <Select
                        value={formData.customerId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, customerId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
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
                      <Label>Pipeline *</Label>
                      <Select
                        value={formData.pipelineId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, pipelineId: value, stageId: '' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pipeline" />
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
                      <Label>Stage *</Label>
                      <Select
                        value={formData.stageId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, stageId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
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
                      <Label>Amount ($)</Label>
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
                      <Label>Probability (%)</Label>
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
                      <Label>Expected Close</Label>
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
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Deal details..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting
                      ? 'Saving...'
                      : editingDeal
                      ? 'Update'
                      : 'Create'}
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
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="WON">Won</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pipelines</SelectItem>
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
                  <TableHead>Deal</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Expected Close</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : deals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No deals found. Create your first deal to get started.
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
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(deal.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
