'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  ArrowLeft,
  Settings,
  DollarSign,
  MoreHorizontal,
  GripVertical,
  Grip,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

// Demo data for when API returns empty
const demoPipeline: Pipeline = {
  id: 'demo-pipeline-1',
  name: 'Sales Pipeline',
  description: 'Main sales pipeline for tracking all deals',
  isDefault: true,
  stages: [
    { id: 'demo-stage-1', name: 'Lead', color: '#6B7280', sortOrder: 0, winProbability: 10 },
    { id: 'demo-stage-2', name: 'Qualified', color: '#3B82F6', sortOrder: 1, winProbability: 25 },
    { id: 'demo-stage-3', name: 'Proposal', color: '#F59E0B', sortOrder: 2, winProbability: 50 },
    { id: 'demo-stage-4', name: 'Negotiation', color: '#8B5CF6', sortOrder: 3, winProbability: 75 },
    { id: 'demo-stage-5', name: 'Closed Won', color: '#10B981', sortOrder: 4, winProbability: 100 },
    { id: 'demo-stage-6', name: 'Closed Lost', color: '#EF4444', sortOrder: 5, winProbability: 0 },
  ],
};

const demoDeals: Deal[] = [
  {
    id: 'demo-deal-1',
    title: 'Enterprise Software License',
    amount: 150000,
    customer: { id: 'demo-customer-1', name: 'TechCorp International' },
    stage: { id: 'demo-stage-3' },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-2',
    title: 'Financial Consulting Package',
    amount: 85000,
    customer: { id: 'demo-customer-2', name: 'Global Finance Ltd' },
    stage: { id: 'demo-stage-2' },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-3',
    title: 'Healthcare Platform Implementation',
    amount: 250000,
    customer: { id: 'demo-customer-3', name: 'HealthPlus Medical' },
    stage: { id: 'demo-stage-4' },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-4',
    title: 'Green Energy Audit',
    amount: 35000,
    customer: { id: 'demo-customer-4', name: 'EcoGreen Solutions' },
    stage: { id: 'demo-stage-1' },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-5',
    title: 'Startup Accelerator Program',
    amount: 120000,
    customer: { id: 'demo-customer-5', name: 'StartupHub Inc' },
    stage: { id: 'demo-stage-5' },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-6',
    title: 'Retail POS System',
    amount: 45000,
    customer: { id: 'demo-customer-6', name: 'RetailMax Group' },
    stage: { id: 'demo-stage-6' },
    updatedAt: new Date().toISOString(),
  },
];

export default function PipelinesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const t = useTranslation();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDescription, setNewPipelineDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Drag-to-scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

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
        if (pipelinesList.length > 0) {
          setPipelines(pipelinesList);
          if (!selectedPipeline) {
            setSelectedPipeline(pipelinesList[0]);
          }
        } else {
          // Use demo data
          setPipelines([demoPipeline]);
          setSelectedPipeline(demoPipeline);
          setDeals(demoDeals);
        }
      } else {
        // Use demo data on error
        setPipelines([demoPipeline]);
        setSelectedPipeline(demoPipeline);
        setDeals(demoDeals);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
      // Use demo data on error
      setPipelines([demoPipeline]);
      setSelectedPipeline(demoPipeline);
      setDeals(demoDeals);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async (pipelineId: string) => {
    // Skip API call for demo pipeline
    if (pipelineId === 'demo-pipeline-1') {
      setDeals(demoDeals);
      return;
    }

    try {
      const response = await fetch(`/api/v1/crm/deals?pipelineId=${pipelineId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const dealsList = data.data || [];
        if (dealsList.length > 0) {
          setDeals(dealsList);
        } else {
          // Use demo deals if empty
          setDeals(demoDeals);
        }
      } else {
        setDeals(demoDeals);
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
      setDeals(demoDeals);
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
      } else {
        // API failed - create demo pipeline locally
        createDemoPipeline();
      }
    } catch (error) {
      console.error('Failed to create pipeline:', error);
      // API not available - create demo pipeline locally
      createDemoPipeline();
    } finally {
      setSubmitting(false);
    }
  };

  const createDemoPipeline = () => {
    const newPipeline: Pipeline = {
      id: `demo-pipeline-${Date.now()}`,
      name: newPipelineName,
      description: newPipelineDescription || null,
      isDefault: pipelines.length === 0,
      stages: [
        { id: `stage-${Date.now()}-1`, name: 'Lead', color: '#6B7280', sortOrder: 0, winProbability: 10 },
        { id: `stage-${Date.now()}-2`, name: 'Qualified', color: '#3B82F6', sortOrder: 1, winProbability: 25 },
        { id: `stage-${Date.now()}-3`, name: 'Proposal', color: '#F59E0B', sortOrder: 2, winProbability: 50 },
        { id: `stage-${Date.now()}-4`, name: 'Negotiation', color: '#8B5CF6', sortOrder: 3, winProbability: 75 },
        { id: `stage-${Date.now()}-5`, name: 'Closed Won', color: '#10B981', sortOrder: 4, winProbability: 100 },
        { id: `stage-${Date.now()}-6`, name: 'Closed Lost', color: '#EF4444', sortOrder: 5, winProbability: 0 },
      ],
    };

    setPipelines([...pipelines, newPipeline]);
    setSelectedPipeline(newPipeline);
    setIsDialogOpen(false);
    setNewPipelineName('');
    setNewPipelineDescription('');
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

  // Drag-to-scroll handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;

    setIsDragging(true);
    setHasDragged(false);
    startXRef.current = e.clientX;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;

    // Prevent text selection while dragging
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    e.preventDefault();
    const deltaX = e.clientX - startXRef.current;

    // Mark as dragged if moved more than 5 pixels (to differentiate from click)
    if (Math.abs(deltaX) > 5) {
      setHasDragged(true);
    }

    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - deltaX;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click handlers to check it
    setTimeout(() => setHasDragged(false), 100);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setTimeout(() => setHasDragged(false), 100);
    }
  }, [isDragging]);

  const handlePipelineChange = (pipelineId: string) => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (pipeline) {
      setSelectedPipeline(pipeline);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header - responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/crm')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t.crm.pipelinesTitle}</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {t.crm.pipelinesSubtitle}
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t.crm.createPipeline}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t.crm.createNewPipeline}</DialogTitle>
                <DialogDescription>
                  {t.crm.addDealToPipeline}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>{t.crm.pipelineName} *</Label>
                  <Input
                    value={newPipelineName}
                    onChange={(e) => setNewPipelineName(e.target.value)}
                    placeholder={t.crm.pipelineNamePlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.crm.description}</Label>
                  <Textarea
                    value={newPipelineDescription}
                    onChange={(e) => setNewPipelineDescription(e.target.value)}
                    placeholder={t.crm.pipelineDescriptionPlaceholder}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  {t.crm.cancel}
                </Button>
                <Button onClick={handleCreatePipeline} disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? t.crm.saving : t.crm.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pipeline Selector - using Select dropdown */}
        {pipelines.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">{t.crm.pipelines}:</Label>
            <Select
              value={selectedPipeline?.id || ''}
              onValueChange={handlePipelineChange}
            >
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder={t.crm.selectPipeline} />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    <div className="flex items-center gap-2">
                      <span>{pipeline.name}</span>
                      {pipeline.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          {t.crm.defaultPipeline}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pipelines.length > 1 && (
              <span className="text-xs text-muted-foreground">
                {pipelines.length} {t.crm.stages}
              </span>
            )}
          </div>
        )}

        {/* Pipeline Board with drag-to-scroll */}
        {selectedPipeline ? (
          <div className="relative">
            {/* Drag hint */}
            <div className="flex items-center justify-center gap-2 mb-2 text-xs text-muted-foreground">
              <Grip className="h-3 w-3" />
              <span>{t.crm.holdAndDragToScroll || 'Hold and drag to scroll'}</span>
            </div>

            {/* Scrollable container with fixed add button */}
            <div className="relative">
              {/* Scrollable stages container - drag to scroll only */}
              <div
                ref={scrollContainerRef}
                className={cn(
                  "flex gap-3 sm:gap-4 pb-4 pr-[100px] overflow-x-scroll",
                  isDragging ? "cursor-grabbing select-none" : "cursor-grab",
                  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
              {selectedPipeline.stages
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((stage) => {
                  const stageDeals = getDealsForStage(stage.id);
                  const stageTotal = getStageTotal(stage.id);

                  return (
                    <div
                      key={stage.id}
                      className="w-[280px] sm:w-[300px] lg:w-[320px] flex-shrink-0"
                    >
                      <Card className="glass h-full">
                        <CardHeader className="pb-2 sm:pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: stage.color }}
                              />
                              <CardTitle className="text-sm sm:text-base truncate">
                                {stage.name}
                              </CardTitle>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {stageDeals.length}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Settings className="mr-2 h-4 w-4" />
                                  {t.crm.edit}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(stageTotal)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                          {stageDeals.length === 0 ? (
                            <div className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
                              {t.crm.noDealsYet}
                            </div>
                          ) : (
                            stageDeals.map((deal) => (
                              <Card
                                key={deal.id}
                                className="cursor-pointer hover:shadow-md transition-shadow bg-glass-light/30"
                                onClick={(e) => {
                                  if (!hasDragged) {
                                    router.push(`/dashboard/crm/deals/${deal.id}`);
                                  }
                                }}
                              >
                                <CardContent className="p-2 sm:p-3">
                                  <div className="flex items-start gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">
                                        {deal.title}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {deal.customer.name}
                                      </div>
                                      {deal.amount && (
                                        <div className="text-xs sm:text-sm font-semibold mt-1 text-cosmic-purple">
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
                            className="w-full border-dashed border text-xs sm:text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!hasDragged) {
                                router.push('/dashboard/crm/deals');
                              }
                            }}
                          >
                            <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            {t.crm.newDeal}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {/* Fixed Create Pipeline button - always visible */}
              <div className="absolute right-0 top-0 bottom-4 w-[90px] flex items-start pt-0 pointer-events-none">
                <Card
                  className="glass w-full h-[200px] flex items-center justify-center cursor-pointer hover:bg-glass-light/50 transition-colors pointer-events-auto"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-cosmic-purple/20 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-cosmic-purple" />
                    </div>
                    <span className="text-xs text-muted-foreground">{t.crm.createPipeline}</span>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : loading ? (
          <Card className="glass">
            <CardContent className="py-8 text-center">
              {t.crm.loading}
            </CardContent>
          </Card>
        ) : (
          <Card className="glass">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                {t.crm.noPipelinesFound}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t.crm.createPipeline}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
