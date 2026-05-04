/**
 * ChecklistSetupTab — versão com pontos por ambiente para etapas do projetista
 *
 * Adiciona coluna "Pts/Ambiente" editável nas etapas de responsabilidade
 * do Projetista Técnico. As outras etapas não mostram essa coluna.
 *
 * Substitui: src/components/setup/ChecklistSetupTab.tsx
 */

import { useState } from 'react';
import { Clock, Save, Loader2, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  useChecklistTemplates,
  useUpdateTemplateSLA,
  getResponsibleAreaLabel,
  getWorkflowStatusLabel,
} from '@/hooks/useChecklist';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PROJETISTA_AREA = 'projetista_tecnico';

export function ChecklistSetupTab() {
  const { data: templates = [], isLoading } = useChecklistTemplates();
  const updateSLA = useUpdateTemplateSLA();
  const queryClient = useQueryClient();

  const [editedSLAs, setEditedSLAs] = useState<Record<string, string>>({});
  const [editedPoints, setEditedPoints] = useState<Record<string, string>>({});
  const [savingPoints, setSavingPoints] = useState<Record<string, boolean>>({});

  const handleSLAChange = (templateId: string, value: string) => {
    setEditedSLAs(prev => ({ ...prev, [templateId]: value }));
  };

  const handlePointsChange = (templateId: string, value: string) => {
    setEditedPoints(prev => ({ ...prev, [templateId]: value }));
  };

  const handleSaveSLA = async (templateId: string) => {
    const value = editedSLAs[templateId];
    const slaDays = value === '' ? null : parseInt(value, 10);
    if (value !== '' && (isNaN(slaDays!) || slaDays! < 0)) return;
    await updateSLA.mutateAsync({ templateId, slaDays });
    setEditedSLAs(prev => { const s = { ...prev }; delete s[templateId]; return s; });
  };

  const handleSavePoints = async (templateId: string, currentPoints: number) => {
    const value = editedPoints[templateId];
    const pts = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(pts) || pts < 0) return;

    setSavingPoints(prev => ({ ...prev, [templateId]: true }));
    try {
      const { error } = await supabase
        .from('checklist_templates')
        .update({ points_per_environment: pts })
        .eq('id', templateId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['checklist_templates'] });
      setEditedPoints(prev => { const s = { ...prev }; delete s[templateId]; return s; });
      toast.success(`Pontuação atualizada: ${pts} pts/ambiente`);
    } catch (err: any) {
      toast.error('Erro ao salvar pontuação', { description: err?.message });
    } finally {
      setSavingPoints(prev => ({ ...prev, [templateId]: false }));
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const status = template.workflow_status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(template);
    return acc;
  }, {} as Record<string, typeof templates>);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Carregando templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="text-xs text-muted-foreground bg-muted/50 px-4 py-3 border border-border">
        <span className="font-medium">Configure os prazos (SLA)</span> para cada etapa do checklist de contratos.
        {' '}Para etapas do <span className="font-medium">Projetista Técnico</span>, configure também os
        <span className="font-medium"> pontos por ambiente</span> do Programa E+.
      </div>

      {Object.entries(groupedTemplates).map(([status, statusTemplates]) => (
        <div key={status} className="space-y-3">
          <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium border-b border-border pb-2">
            {getWorkflowStatusLabel(status)}
          </h3>

          <div className="space-y-2">
            {statusTemplates.map(template => {
              const isProjetista = template.responsible_area === PROJETISTA_AREA;
              const currentSLA = editedSLAs[template.id] ?? (template.default_sla_days?.toString() || '');
              const currentPoints = editedPoints[template.id] ?? ((template as any).points_per_environment?.toString() || '0');
              const hasSLAChanges = editedSLAs[template.id] !== undefined;
              const hasPointsChanges = editedPoints[template.id] !== undefined;

              return (
                <div
                  key={template.id}
                  className={`flex items-center gap-4 p-3 border bg-card hover:bg-muted/30 transition-colors ${
                    isProjetista ? 'border-amber-200/50 dark:border-amber-800/30' : 'border-border'
                  }`}
                >
                  {/* Info da etapa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">
                        #{template.step_order}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {template.step_order === 13 ? 'Planilha de Controle de Pedidos atualizada' : template.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {getResponsibleAreaLabel(template.responsible_area)}
                      </span>
                      {isProjetista && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          Programa E+
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SLA */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Dias"
                      value={currentSLA}
                      onChange={e => handleSLAChange(template.id, e.target.value)}
                      className="w-20 text-center h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">dias</span>
                    {hasSLAChanges && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => handleSaveSLA(template.id)}
                        disabled={updateSLA.isPending}
                      >
                        {updateSLA.isPending
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Save className="h-3 w-3" />
                        }
                      </Button>
                    )}
                  </div>

                  {/* Pontos por ambiente — só para projetista */}
                  {isProjetista && (
                    <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-border">
                      <Star className="h-4 w-4 text-amber-500" />
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={currentPoints}
                        onChange={e => handlePointsChange(template.id, e.target.value)}
                        className="w-16 text-center h-8 text-sm border-amber-200 dark:border-amber-800/50"
                      />
                      <span className="text-xs text-muted-foreground">pts/amb.</span>
                      {hasPointsChanges && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => handleSavePoints(template.id, (template as any).points_per_environment || 0)}
                          disabled={savingPoints[template.id]}
                        >
                          {savingPoints[template.id]
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Save className="h-3 w-3" />
                          }
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
