'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import { useCRMStore, useCRMHydration } from '@/stores/crm.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateWithTimezone } from '@/lib/utils';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  User,
  Building2,
  TrendingUp,
  Pencil,
  Trash2,
  Clock,
  Target,
  Phone,
  Mail,
  Activity,
} from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  amount: number | null;
  probability: number | null;
  expectedCloseDate: string | null;
  status: 'OPEN' | 'WON' | 'LOST';
  description?: string | null;
  customer: { id: string; name: string; email?: string; phone?: string };
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

// Demo data for when API returns 404
const demoDeals: Record<string, Deal> = {
  'demo-deal-1': {
    id: 'demo-deal-1',
    title: 'Enterprise Software License',
    amount: 150000,
    probability: 75,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    description: 'Enterprise-level software licensing deal for TechCorp International. Includes 500 user licenses, premium support, and custom integrations.',
    customer: { id: 'demo-customer-1', name: 'TechCorp International', email: 'contact@techcorp.io', phone: '+1 (555) 123-4567' },
    stage: { id: 'demo-stage-3', name: 'Proposal', color: '#F59E0B' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-deal-2': {
    id: 'demo-deal-2',
    title: 'Financial Consulting Package',
    amount: 85000,
    probability: 60,
    expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    description: 'Comprehensive financial consulting package including audit services, compliance review, and strategic planning.',
    customer: { id: 'demo-customer-2', name: 'Global Finance Ltd', email: 'info@globalfinance.com', phone: '+1 (555) 234-5678' },
    stage: { id: 'demo-stage-2', name: 'Qualified', color: '#3B82F6' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-deal-3': {
    id: 'demo-deal-3',
    title: 'Healthcare Platform Implementation',
    amount: 250000,
    probability: 90,
    expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    description: 'Full healthcare management platform implementation with EMR integration, patient portal, and analytics dashboard.',
    customer: { id: 'demo-customer-3', name: 'HealthPlus Medical', email: 'partners@healthplus.org', phone: '+1 (555) 456-7890' },
    stage: { id: 'demo-stage-4', name: 'Negotiation', color: '#8B5CF6' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-deal-4': {
    id: 'demo-deal-4',
    title: 'Green Energy Audit',
    amount: 35000,
    probability: 40,
    expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    description: 'Environmental impact assessment and energy efficiency audit for corporate sustainability initiative.',
    customer: { id: 'demo-customer-4', name: 'EcoGreen Solutions', email: 'business@ecogreen.co', phone: '+44 20 7123 4567' },
    stage: { id: 'demo-stage-1', name: 'Lead', color: '#6B7280' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-deal-5': {
    id: 'demo-deal-5',
    title: 'Startup Accelerator Program',
    amount: 120000,
    probability: 100,
    expectedCloseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'WON',
    description: 'Completed accelerator program engagement including mentorship, funding facilitation, and market entry strategy.',
    customer: { id: 'demo-customer-5', name: 'StartupHub Inc', email: 'hello@startuphub.io', phone: '+1 (555) 567-8901' },
    stage: { id: 'demo-stage-5', name: 'Closed Won', color: '#10B981' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-deal-6': {
    id: 'demo-deal-6',
    title: 'Retail POS System',
    amount: 45000,
    probability: 0,
    expectedCloseDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'LOST',
    description: 'Point of sale system implementation proposal - lost to competitor due to pricing.',
    customer: { id: 'demo-customer-6', name: 'RetailMax Group', email: 'procurement@retailmax.com', phone: '+1 (555) 678-9012' },
    stage: { id: 'demo-stage-6', name: 'Closed Lost', color: '#EF4444' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

const demoPipeline: Pipeline = {
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
};

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const { language, timezone } = useSettingsStore();
  const t = useTranslation();
  const dealId = params.id as string;

  // CRM Store for demo deals
  const { deals: storeDeals, pipelines: storePipelines, updateDeal: storeUpdateDeal, moveDealToStage, deleteDeal: storeDeleteDeal } = useCRMStore();
  const hasHydrated = useCRMHydration();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    amount: '',
    probability: '',
    expectedCloseDate: '',
    description: '',
    stageId: '',
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (hasHydrated) {
      fetchDeal();
    }
  }, [dealId, hasHydrated]);

  const fetchDeal = async () => {
    setLoading(true);

    // Check if it's a demo deal - use CRM store
    if (dealId.startsWith('demo-') || storeDeals.some(d => d.id === dealId)) {
      const storeDeal = storeDeals.find(d => d.id === dealId);
      const storePipeline = storePipelines.find(p => p.id === (storeDeal?.pipeline.id || 'demo-pipeline-1'));

      if (storeDeal) {
        // Convert store deal to page Deal type
        const convertedDeal: Deal = {
          ...storeDeal,
          description: storeDeal.notes,
          customer: {
            ...storeDeal.customer,
            email: undefined,
            phone: undefined,
          },
        };
        setDeal(convertedDeal);
        setPipeline(storePipeline ? {
          id: storePipeline.id,
          name: storePipeline.name,
          stages: storePipeline.stages.map(s => ({
            id: s.id,
            name: s.name,
            color: s.color,
            sortOrder: s.sortOrder,
          })),
        } : demoPipeline);
        setEditForm({
          title: storeDeal.title,
          amount: storeDeal.amount?.toString() || '',
          probability: storeDeal.probability?.toString() || '',
          expectedCloseDate: storeDeal.expectedCloseDate?.split('T')[0] || '',
          description: storeDeal.notes || '',
          stageId: storeDeal.stage.id,
        });
        setLoading(false);
        return;
      }

      // Fallback to static demo data if not in store
      const demoDeal = demoDeals[dealId];
      if (demoDeal) {
        setDeal(demoDeal);
        setPipeline(demoPipeline);
        setEditForm({
          title: demoDeal.title,
          amount: demoDeal.amount?.toString() || '',
          probability: demoDeal.probability?.toString() || '',
          expectedCloseDate: demoDeal.expectedCloseDate?.split('T')[0] || '',
          description: demoDeal.description || '',
          stageId: demoDeal.stage.id,
        });
      }
      setLoading(false);
      return;
    }

    try {
      const [dealResponse, pipelineResponse] = await Promise.all([
        fetch(`/api/v1/crm/deals/${dealId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/crm/pipelines', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (dealResponse.ok) {
        const dealData = await dealResponse.json();
        setDeal(dealData.data);
        setEditForm({
          title: dealData.data.title,
          amount: dealData.data.amount?.toString() || '',
          probability: dealData.data.probability?.toString() || '',
          expectedCloseDate: dealData.data.expectedCloseDate?.split('T')[0] || '',
          description: dealData.data.description || '',
          stageId: dealData.data.stage.id,
        });
      }

      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json();
        const pipelines = pipelineData.data || [];
        if (pipelines.length > 0) {
          setPipeline(pipelines[0]);
        } else {
          setPipeline(demoPipeline);
        }
      }
    } catch (error) {
      console.error('Failed to fetch deal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeal = async () => {
    // For demo deals or store deals, update via CRM store
    if (dealId.startsWith('demo-') || storeDeals.some(d => d.id === dealId)) {
      if (deal && pipeline) {
        const newStage = pipeline.stages.find(s => s.id === editForm.stageId);

        // Update in store
        storeUpdateDeal(dealId, {
          title: editForm.title,
          amount: editForm.amount ? parseFloat(editForm.amount) : null,
          probability: editForm.probability ? parseInt(editForm.probability) : (newStage ? storePipelines.find(p => p.id === deal.pipeline.id)?.stages.find(s => s.id === editForm.stageId)?.winProbability || 0 : deal.probability || 0),
          expectedCloseDate: editForm.expectedCloseDate || null,
          notes: editForm.description,
          stage: newStage ? { id: newStage.id, name: newStage.name, color: newStage.color } : deal.stage,
        });

        // Update local state
        const updatedDeal: Deal = {
          ...deal,
          title: editForm.title,
          amount: editForm.amount ? parseFloat(editForm.amount) : null,
          probability: editForm.probability ? parseInt(editForm.probability) : null,
          expectedCloseDate: editForm.expectedCloseDate || null,
          description: editForm.description,
          stage: newStage || deal.stage,
        };
        setDeal(updatedDeal);
      }
      setIsEditDialogOpen(false);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/v1/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editForm.title,
          amount: editForm.amount ? parseFloat(editForm.amount) : null,
          probability: editForm.probability ? parseInt(editForm.probability) : null,
          expectedCloseDate: editForm.expectedCloseDate || null,
          description: editForm.description,
          stageId: editForm.stageId,
        }),
      });

      if (response.ok) {
        fetchDeal();
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to update deal:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);

    // For demo deals or store deals, delete via CRM store
    if (dealId.startsWith('demo-') || storeDeals.some(d => d.id === dealId)) {
      storeDeleteDeal(dealId);
      router.push('/dashboard/crm/deals');
      return;
    }

    try {
      const response = await fetch(`/api/v1/crm/deals/${dealId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        router.push('/dashboard/crm/deals');
      }
    } catch (error) {
      console.error('Failed to delete deal:', error);
    }
  };

  const handleStageChange = async (newStageId: string) => {
    // For demo deals or store deals, update via CRM store
    if (dealId.startsWith('demo-') || storeDeals.some(d => d.id === dealId)) {
      if (deal && pipeline) {
        const newStage = pipeline.stages.find(s => s.id === newStageId);
        if (newStage) {
          // Update in store using moveDealToStage for proper status/probability updates
          moveDealToStage(dealId, newStageId, deal.pipeline.id);
          // Update local state
          setDeal({ ...deal, stage: newStage });
        }
      }
      return;
    }

    try {
      const response = await fetch(`/api/v1/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stageId: newStageId }),
      });

      if (response.ok) {
        fetchDeal();
      }
    } catch (error) {
      console.error('Failed to update stage:', error);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t.crm.loading}</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!deal) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-muted-foreground">Deal not found</div>
          <Button onClick={() => router.push('/dashboard/crm/deals')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deals
          </Button>
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
              onClick={() => router.push('/dashboard/crm/deals')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{deal.title}</h1>
                {getStatusBadge(deal.status)}
              </div>
              <p className="text-muted-foreground">
                {deal.pipeline.name} - {deal.customer.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t.crm.edit}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t.crm.delete}
            </Button>
          </div>
        </div>

        {/* Pipeline Progress */}
        {pipeline && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t.crm.stage}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {pipeline.stages
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((stage) => {
                    const isActive = stage.id === deal.stage.id;
                    const isPast = pipeline.stages
                      .filter(s => s.sortOrder < stage.sortOrder)
                      .some(s => s.id === deal.stage.id) ||
                      stage.sortOrder < (pipeline.stages.find(s => s.id === deal.stage.id)?.sortOrder || 0);

                    return (
                      <button
                        key={stage.id}
                        onClick={() => handleStageChange(stage.id)}
                        className={`
                          flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all
                          ${isActive
                            ? 'text-white shadow-lg'
                            : isPast
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }
                        `}
                        style={isActive ? { backgroundColor: stage.color } : {}}
                      >
                        {stage.name}
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deal Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.crm.description}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {deal.description || 'No description provided.'}
                </p>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">Deal updated</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateWithTimezone(deal.updatedAt, language, timezone)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                      <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Deal created</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateWithTimezone(deal.createdAt, language, timezone)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Deal Info */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.crm.amount}</p>
                    <p className="font-semibold text-lg">
                      {deal.amount ? formatCurrency(deal.amount) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.crm.probability}</p>
                    <p className="font-semibold">
                      {deal.probability !== null ? `${deal.probability}%` : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.crm.expectedCloseDate}</p>
                    <p className="font-semibold">
                      {deal.expectedCloseDate ? formatDateWithTimezone(deal.expectedCloseDate, language, timezone) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.crm.assignedTo}</p>
                    <p className="font-semibold">
                      {deal.assignedTo
                        ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t.crm.customer}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-semibold">{deal.customer.name}</p>
                {deal.customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${deal.customer.email}`} className="text-blue-600 hover:underline">
                      {deal.customer.email}
                    </a>
                  </div>
                )}
                {deal.customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${deal.customer.phone}`} className="text-blue-600 hover:underline">
                      {deal.customer.phone}
                    </a>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/dashboard/crm/customers/${deal.customer.id}`)}
                >
                  View Customer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.crm.editDeal}</DialogTitle>
            <DialogDescription>{t.crm.updateDealInfo}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.crm.dealTitle}</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.crm.amount} ($)</Label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.probability} (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.probability}
                  onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.crm.expectedCloseDate}</Label>
              <Input
                type="date"
                value={editForm.expectedCloseDate}
                onChange={(e) => setEditForm({ ...editForm, expectedCloseDate: e.target.value })}
              />
            </div>
            {pipeline && (
              <div className="space-y-2">
                <Label>{t.crm.stage}</Label>
                <Select
                  value={editForm.stageId}
                  onValueChange={(value) => setEditForm({ ...editForm, stageId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pipeline.stages
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
            <div className="space-y-2">
              <Label>{t.crm.description}</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t.crm.cancel}
            </Button>
            <Button onClick={handleUpdateDeal} disabled={saving}>
              {saving ? t.crm.saving : t.crm.update}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              {t.crm.confirmDelete}
            </DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Сделка будет удалена навсегда.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
