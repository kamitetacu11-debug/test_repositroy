'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
import { useCRMStore, useCRMHydration, PipelineStage } from '@/stores/crm.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Plus,
  ArrowLeft,
  Settings,
  DollarSign,
  MoreHorizontal,
  GripVertical,
  Grip,
  Loader2,
  Trash2,
  Pencil,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function PipelinesPage() {
  const router = useRouter();
  const t = useTranslation();
  const hasHydrated = useCRMHydration();
  const { getCurrentTheme } = useSettingsStore();
  const theme = getCurrentTheme();

  // Get data from CRM store
  const { pipelines, deals, addPipeline, updatePipeline, deletePipeline } = useCRMStore();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDescription, setNewPipelineDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit stage state
  const [isEditStageOpen, setIsEditStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('');
  const [editStageWinProbability, setEditStageWinProbability] = useState('');

  // Drag-to-scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Set default pipeline after hydration
  useEffect(() => {
    if (hasHydrated && pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [hasHydrated, pipelines, selectedPipelineId]);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || null;

  // Get deals for the selected pipeline
  const pipelineDeals = selectedPipeline
    ? deals.filter(d => d.pipeline.id === selectedPipeline.id)
    : [];

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) return;

    setSubmitting(true);

    const newPipeline = addPipeline({
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
    });

    setSelectedPipelineId(newPipeline.id);
    setIsDialogOpen(false);
    setNewPipelineName('');
    setNewPipelineDescription('');
    setSubmitting(false);
  };

  // Open edit stage dialog
  const handleEditStage = (stage: PipelineStage) => {
    setEditingStage(stage);
    setEditStageName(stage.name);
    setEditStageColor(stage.color);
    setEditStageWinProbability(stage.winProbability.toString());
    setIsEditStageOpen(true);
  };

  // Save stage changes
  const handleSaveStage = () => {
    if (!editingStage || !selectedPipeline) return;

    const updatedStages = selectedPipeline.stages.map(s =>
      s.id === editingStage.id
        ? {
            ...s,
            name: editStageName,
            color: editStageColor,
            winProbability: parseInt(editStageWinProbability) || 0
          }
        : s
    );

    updatePipeline(selectedPipeline.id, { stages: updatedStages });
    setIsEditStageOpen(false);
    setEditingStage(null);
  };

  // Delete stage
  const handleDeleteStage = (stageId: string) => {
    if (!selectedPipeline) return;
    if (!confirm('Are you sure you want to delete this stage?')) return;

    const updatedStages = selectedPipeline.stages.filter(s => s.id !== stageId);
    updatePipeline(selectedPipeline.id, { stages: updatedStages });
  };

  // Add new stage
  const handleAddStage = () => {
    if (!selectedPipeline) return;

    const maxSortOrder = Math.max(...selectedPipeline.stages.map(s => s.sortOrder), -1);
    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name: 'New Stage',
      color: '#6B7280',
      sortOrder: maxSortOrder + 1,
      winProbability: 50
    };

    updatePipeline(selectedPipeline.id, {
      stages: [...selectedPipeline.stages, newStage]
    });
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
    return pipelineDeals.filter((deal) => deal.stage.id === stageId);
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

    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    e.preventDefault();
    const deltaX = e.clientX - startXRef.current;

    if (Math.abs(deltaX) > 5) {
      setHasDragged(true);
    }

    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - deltaX;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setTimeout(() => setHasDragged(false), 100);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setTimeout(() => setHasDragged(false), 100);
    }
  }, [isDragging]);

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
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
      {/* Fixed floating Create Pipeline button - always visible */}
      <button
        onClick={() => setIsDialogOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-cosmic-purple hover:bg-cosmic-purple/90 text-white shadow-lg transition-all hover:scale-105"
        style={{ boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)' }}
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium hidden sm:inline">{t.crm.createPipeline}</span>
      </button>

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
            <DialogContent
              className="max-w-[95vw] sm:max-w-lg glass"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.background}f0 0%, ${theme.colors.background}e0 100%)`,
                borderColor: `${theme.colors.primary}40`,
                boxShadow: `0 0 40px ${theme.colors.glow1}, 0 0 80px ${theme.colors.glow2}`
              }}
            >
              <DialogHeader>
                <DialogTitle style={{ color: theme.colors.primary }}>{t.crm.createNewPipeline}</DialogTitle>
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
                <Button
                  onClick={handleCreatePipeline}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                    border: 'none'
                  }}
                >
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
              value={selectedPipelineId || ''}
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
                {pipelines.length} {t.crm.pipelines}
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

            {/* Scrollable stages container - drag to scroll only */}
            <div
              ref={scrollContainerRef}
              className={cn(
                "flex gap-3 sm:gap-4 pb-4 overflow-x-scroll",
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
                              <DropdownMenuContent
                                align="end"
                                className="glass"
                                style={{
                                  background: `${theme.colors.background}f5`,
                                  borderColor: `${theme.colors.primary}40`
                                }}
                              >
                                <DropdownMenuItem onClick={() => handleEditStage(stage)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t.crm.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteStage(stage.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t.crm.delete}
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
          </div>
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

        {/* Edit Stage Dialog */}
        <Dialog open={isEditStageOpen} onOpenChange={setIsEditStageOpen}>
          <DialogContent
            className="max-w-[95vw] sm:max-w-md glass"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.background}f0 0%, ${theme.colors.background}e0 100%)`,
              borderColor: `${theme.colors.primary}40`,
              boxShadow: `0 0 40px ${theme.colors.glow1}, 0 0 80px ${theme.colors.glow2}`
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: theme.colors.primary }}>
                {t.crm.edit} {t.crm.stage}
              </DialogTitle>
              <DialogDescription>
                {t.crm.updateDealInfo || 'Update stage information'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{t.crm.stageName} *</Label>
                <Input
                  value={editStageName}
                  onChange={(e) => setEditStageName(e.target.value)}
                  placeholder={t.crm.stageName}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.winProbability} (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editStageWinProbability}
                  onChange={(e) => setEditStageWinProbability(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editStageColor}
                    onChange={(e) => setEditStageColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-glass-border cursor-pointer"
                    style={{ background: 'transparent' }}
                  />
                  <Input
                    value={editStageColor}
                    onChange={(e) => setEditStageColor(e.target.value)}
                    placeholder="#6B7280"
                    className="flex-1"
                  />
                  <div
                    className="w-10 h-10 rounded-lg border border-glass-border"
                    style={{ backgroundColor: editStageColor }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditStageOpen(false)}
                className="w-full sm:w-auto"
              >
                {t.crm.cancel}
              </Button>
              <Button
                onClick={handleSaveStage}
                className="w-full sm:w-auto"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                  border: 'none'
                }}
              >
                {t.crm.update}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
