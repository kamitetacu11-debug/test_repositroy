'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import {
  Plus,
  ArrowLeft,
  Settings,
  DollarSign,
  MoreHorizontal,
  GripVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  winProbability: number;
}

interface Deal {
  id: string;
  title: string;
  amount: number | null;
  customer: { id: string; name: string };
  stage: { id: string };
  updatedAt: string;
}

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stages: PipelineStage[];
}

export default function PipelinesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDescription, setNewPipelineDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchDeals(selectedPipeline.id);
    }
  }, [selectedPipeline]);

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/v1/crm/pipelines', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const pipelinesList = data.data || [];
        setPipelines(pipelinesList);
        if (pipelinesList.length > 0 && !selectedPipeline) {
          setSelectedPipeline(pipelinesList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async (pipelineId: string) => {
    try {
      const response = await fetch(`/api/v1/crm/deals?pipelineId=${pipelineId}`, {
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
    }
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/v1/crm/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPipelineName,
          description: newPipelineDescription || null,
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setNewPipelineName('');
        setNewPipelineDescription('');
        fetchPipelines();
      }
    } catch (error) {
      console.error('Failed to create pipeline:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveDeal = async (dealId: string, newStageId: string) => {
    try {
      const response = await fetch(`/api/v1/crm/deals/${dealId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stageId: newStageId }),
      });

      if (response.ok && selectedPipeline) {
        fetchDeals(selectedPipeline.id);
      }
    } catch (error) {
      console.error('Failed to move deal:', error);
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

  const getDealsForStage = (stageId: string) => {
    return deals.filter((deal) => deal.stage.id === stageId);
  };

  const getStageTotal = (stageId: string) => {
    return getDealsForStage(stageId).reduce(
      (sum, deal) => sum + (deal.amount || 0),
      0
    );
  };

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
              <h1 className="text-3xl font-bold">Sales Pipelines</h1>
              <p className="text-muted-foreground">
                Manage your sales pipeline stages
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Pipeline
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Pipeline</DialogTitle>
                <DialogDescription>
                  Create a new sales pipeline to track your deals
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Pipeline Name *</Label>
                  <Input
                    value={newPipelineName}
                    onChange={(e) => setNewPipelineName(e.target.value)}
                    placeholder="e.g., Enterprise Sales"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newPipelineDescription}
                    onChange={(e) => setNewPipelineDescription(e.target.value)}
                    placeholder="Pipeline description..."
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
                <Button onClick={handleCreatePipeline} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pipeline Selector */}
        {pipelines.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {pipelines.map((pipeline) => (
              <Button
                key={pipeline.id}
                variant={selectedPipeline?.id === pipeline.id ? 'default' : 'outline'}
                onClick={() => setSelectedPipeline(pipeline)}
              >
                {pipeline.name}
                {pipeline.isDefault && (
                  <Badge variant="secondary" className="ml-2">
                    Default
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )}

        {/* Pipeline Board */}
        {selectedPipeline ? (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {selectedPipeline.stages
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((stage) => {
                  const stageDeals = getDealsForStage(stage.id);
                  const stageTotal = getStageTotal(stage.id);

                  return (
                    <div
                      key={stage.id}
                      className="w-[320px] flex-shrink-0"
                    >
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              <CardTitle className="text-base">
                                {stage.name}
                              </CardTitle>
                              <Badge variant="secondary" className="text-xs">
                                {stageDeals.length}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Edit Stage
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(stageTotal)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                          {stageDeals.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8 text-sm">
                              No deals in this stage
                            </div>
                          ) : (
                            stageDeals.map((deal) => (
                              <Card
                                key={deal.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() =>
                                  router.push(`/dashboard/crm/deals/${deal.id}`)
                                }
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        {deal.title}
                                      </div>
                                      <div className="text-sm text-muted-foreground truncate">
                                        {deal.customer.name}
                                      </div>
                                      {deal.amount && (
                                        <div className="text-sm font-semibold mt-1">
                                          {formatCurrency(deal.amount)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                          <Button
                            variant="ghost"
                            className="w-full border-dashed border"
                            onClick={() => {
                              router.push('/dashboard/crm/deals');
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Deal
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              Loading pipelines...
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No pipelines yet. Create your first pipeline to start tracking deals.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Pipeline
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
