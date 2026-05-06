/**
 * ContractChecklistView — versão melhorada
 *
 * Melhorias em relação ao original:
 * 1. Badge de responsável colorido por área em cada etapa (nome + área)
 * 2. Contador de atraso em dias (vermelho) ou dias restantes (verde/laranja)
 * 3. KPIs no topo: concluídas / em atraso / dias acumulados / previsão de conclusão
 * 4. Etapa 5 (RT ao Financeiro) pulável quando não há RT
 * 5. Etapa 13 renomeada para "Planilha de Controle de Pedidos atualizada"
 * 6. Alerta de risco nas etapas bloqueadas que já estariam atrasadas no ritmo atual
 *
 * Substitui: src/components/comercial/ContractChecklistView.tsx
 */

import { useState, useMemo } from 'react';
import { format, parseISO, differenceInBusinessDays, addBusinessDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  User,
  AlertTriangle,
  UserCog,
  SkipForward,
  TrendingDown,
  CalendarClock,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  useContractChecklist,
  getWorkflowStatusLabel,
  getResponsibleAreaLabel,
} from '@/hooks/useChecklist';
import { useApp } from '@/contexts/AppContext';
import { ReassignChecklistProfessionalsModal } from './ReassignChecklistProfessionalsModal';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Constantes de área → cor ──────────────────────────────────────────────────

const AREA_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  comercial:          { bg: '#EEEDFE', text: '#534AB7', border: '#AFA9EC', label: 'Comercial' },
  projetista_tecnico: { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', label: 'Projetista Técnico' },
  logistica:          { bg: '#E1F5EE', text: '#0F6E56', border: '#5DCAA5', label: 'Analista de Logística' },
  cs:                 { bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB', label: 'Analista de CS' },
};

function AreaBadge({ area }: { area: string }) {
  const c = AREA_COLORS[area] || { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9', label: area };
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      border: `0.5px solid ${c.border}`,
      fontSize: '10px',
      padding: '1px 7px',
      borderRadius: '4px',
      fontWeight: 500,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap' as const,
    }}>
      {c.label}
    </span>
  );
}

// ── Helper: status de prazo ───────────────────────────────────────────────────

interface DeadlineStatus {
  label: string;
  color: string;
  bgColor: string;
  isOverdue: boolean;
  days: number;
}

function getDeadlineStatus(dueDate: string | null, isCompleted: boolean, completedAt?: string | null): DeadlineStatus | null {
  if (!dueDate) return null;

  const reference = isCompleted && completedAt ? parseISO(completedAt) : new Date();
  const due = parseISO(dueDate);
  const diff = differenceInBusinessDays(due, reference);

  if (isCompleted) {
    // Concluída dentro ou fora do prazo?
    if (diff >= 0) {
      return { label: 'No prazo', color: '#0F6E56', bgColor: '#E1F5EE', isOverdue: false, days: diff };
    }
    return { label: `${Math.abs(diff)} du de atraso`, color: '#A32D2D', bgColor: '#FCEBEB', isOverdue: true, days: Math.abs(diff) };
  }

  if (diff < 0) {
    return { label: `Atrasado ${Math.abs(diff)} du`, color: '#A32D2D', bgColor: '#FCEBEB', isOverdue: true, days: Math.abs(diff) };
  }
  if (diff === 0) {
    return { label: 'Vence hoje', color: '#854F0B', bgColor: '#FAEEDA', isOverdue: false, days: 0 };
  }
  if (diff <= 2) {
    return { label: `${diff} du restante${diff > 1 ? 's' : ''}`, color: '#854F0B', bgColor: '#FAEEDA', isOverdue: false, days: diff };
  }
  return { label: `${diff} du restantes`, color: '#0F6E56', bgColor: '#E1F5EE', isOverdue: false, days: diff };
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  projectId: string;
}

export function ContractChecklistView({ projectId }: Props) {
  const { data: checklistData, isLoading } = useContractChecklist(projectId);
  const { teamMembers } = useApp();
  const queryClient = useQueryClient();

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);

  const getTeamMemberName = (id: string | null) => {
    if (!id) return null;
    return teamMembers.find(m => m.id === id)?.name || null;
  };

  const assignedProjetistaName       = getTeamMemberName(checklistData?.assigned_projetista_id);
  const assignedLogisticaName        = getTeamMemberName(checklistData?.assigned_logistica_id);
  const assignedCsName               = getTeamMemberName((checklistData as any)?.assigned_cs_id);
  const assignedApresentacaoName     = getTeamMemberName((checklistData as any)?.assigned_apresentacao_projetista_id);

  const items: any[] = checklistData?.checklist_items || [];

  // ── KPIs calculados ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total      = items.length;
    const completed  = items.filter(i => i.status === 'completed').length;
    const skipped    = items.filter(i => i.status === 'skipped').length;
    const active     = items.find(i => i.status === 'active');
    const today      = new Date();

    // Etapas em atraso (ativas ou bloqueadas com due_date vencida)
    const overdueItems = items.filter(i => {
      if (i.status === 'completed' || i.status === 'skipped') return false;
      if (!i.due_date) return false;
      return differenceInBusinessDays(parseISO(i.due_date), today) < 0;
    });

    const totalOverdueDays = overdueItems.reduce((sum, i) => {
      if (!i.due_date) return sum;
      return sum + Math.abs(differenceInBusinessDays(parseISO(i.due_date), today));
    }, 0);

    // Previsão de conclusão: soma dos SLAs das etapas restantes (não concluídas/puladas)
    const remainingItems = items.filter(i => i.status !== 'completed' && i.status !== 'skipped');
    const remainingSLADays = remainingItems.reduce((sum, i) => {
      if (!i.due_date) return sum;
      const diff = differenceInBusinessDays(parseISO(i.due_date), today);
      return sum + (diff > 0 ? diff : 0);
    }, 0);

    const estimatedConclusion = remainingSLADays > 0
      ? format(addBusinessDays(today, remainingSLADays), "dd/MM/yyyy", { locale: ptBR })
      : null;

    const progress = total > 0
      ? Math.round(((completed + skipped) / total) * 100)
      : 0;

    return {
      total, completed, skipped, overdueCount: overdueItems.length,
      totalOverdueDays, estimatedConclusion, progress, active,
    };
  }, [items]);

  // ── Pular etapa (RT ao Financeiro — etapa 5) ─────────────────────────────

  const handleSkipStep = async (itemId: string, itemName: string) => {
    setSkippingId(itemId);
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ status: 'skipped', notes: 'Etapa pulada: não aplicável para este contrato' })
        .eq('id', itemId);

      if (error) throw error;

      // Activate next step
      const currentIdx = items.findIndex(i => i.id === itemId);
      if (currentIdx !== -1 && currentIdx + 1 < items.length) {
        const nextItem = items[currentIdx + 1];
        if (nextItem.status === 'blocked') {
          await supabase
            .from('checklist_items')
            .update({ status: 'active' })
            .eq('id', nextItem.id);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['contract-checklist', projectId] });
      toast.success(`"${itemName}" pulada com sucesso`);
    } catch (err: any) {
      toast.error('Erro ao pular etapa', { description: err?.message });
    } finally {
      setSkippingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="py-8 text-center text-neutral-300 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando checklist...
      </div>
    );
  }

  if (!checklistData) {
    return (
      <div className="py-6 text-center border border-dashed border-neutral-500 rounded-lg">
        <AlertTriangle className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
        <p className="text-sm text-neutral-200">Checklist não encontrado para este contrato.</p>
        <p className="text-xs text-neutral-400 mt-1">O checklist é criado automaticamente ao registrar uma venda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── KPIs no topo ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Progresso */}
        <div className="bg-neutral-700 rounded-lg p-3 border border-neutral-600">
          <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-1">Concluídas</p>
          <p className="text-xl font-light text-white tabular-nums">
            {kpis.completed + kpis.skipped}
            <span className="text-sm text-neutral-400"> / {kpis.total}</span>
          </p>
          <div className="mt-2 h-1.5 bg-neutral-600 rounded-sm overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-sm transition-all"
              style={{ width: `${kpis.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">{kpis.progress}% completo</p>
        </div>

        {/* Em atraso */}
        <div className={`rounded-lg p-3 border ${
          kpis.overdueCount > 0
            ? 'bg-red-900/30 border-red-700/50'
            : 'bg-neutral-700 border-neutral-600'
        }`}>
          <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-1">Em atraso</p>
          <p className={`text-xl font-light tabular-nums ${kpis.overdueCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {kpis.overdueCount}
            <span className="text-sm text-neutral-400"> etapa{kpis.overdueCount !== 1 ? 's' : ''}</span>
          </p>
          {kpis.totalOverdueDays > 0 && (
            <p className="text-[10px] text-red-400 mt-1">{kpis.totalOverdueDays} du acumulados</p>
          )}
        </div>

        {/* Etapa atual */}
        <div className="bg-neutral-700 rounded-lg p-3 border border-neutral-600">
          <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-1">Etapa atual</p>
          {kpis.active ? (
            <>
              <p className="text-sm font-medium text-white leading-tight">{kpis.active.name}</p>
              <AreaBadge area={kpis.active.responsible_area} />
            </>
          ) : (
            <p className="text-sm text-green-400 font-medium">Concluído ✓</p>
          )}
        </div>

        {/* Previsão de conclusão */}
        <div className="bg-neutral-700 rounded-lg p-3 border border-neutral-600">
          <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-1">
            <CalendarClock className="h-3 w-3 inline mr-1" />
            Previsão
          </p>
          <p className="text-sm font-medium text-white">
            {kpis.estimatedConclusion || (checklistData.is_completed ? 'Concluído' : '—')}
          </p>
          <p className="text-[10px] text-neutral-400 mt-1">se ritmo mantido</p>
        </div>
      </div>

      {/* ── Responsáveis atribuídos ─────────────────────────────────── */}
      <div className="bg-neutral-700 p-4 rounded-lg border border-neutral-600">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium">
            Responsáveis atribuídos
          </span>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs text-neutral-300 hover:text-white hover:bg-neutral-600"
            onClick={() => setReassignModalOpen(true)}
          >
            <UserCog className="h-3.5 w-3.5 mr-1" />
            Reatribuir
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Projetista Técnico',    name: assignedProjetistaName,    area: 'projetista_tecnico' },
            { label: 'Projetista Apresentação', name: assignedApresentacaoName, area: 'projetista_tecnico' },
            { label: 'Analista de Logística', name: assignedLogisticaName,    area: 'logistica' },
            { label: 'Analista de CS',        name: assignedCsName,           area: 'cs' },
          ].map(({ label, name, area }) => (
            <div key={label}>
              <p className="text-[10px] text-neutral-400 mb-1">{label}</p>
              {name ? (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-neutral-400" />
                  <p className="text-sm font-medium text-white">{name}</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 italic">Não atribuído</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Lista de etapas ─────────────────────────────────────────── */}
      <div className="space-y-1">
        <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium block mb-2">
          Todas as etapas
        </span>

        <div className="border border-neutral-600 rounded-lg divide-y divide-neutral-600 overflow-hidden">
          {items.map((item: any) => {
            const isCompleted = item.status === 'completed';
            const isActive    = item.status === 'active';
            const isBlocked   = item.status === 'blocked';
            const isSkipped   = item.status === 'skipped';

            const completedByName = getTeamMemberName(item.completed_by);
            const assignedName    = getTeamMemberName(item.assigned_to);

            const deadline = getDeadlineStatus(item.due_date, isCompleted, item.completed_at);

            // Etapa 5 (RT ao Financeiro) — pulável
            const isSkippable = item.step_order === 5 && isActive;

            // Nome ajustado da etapa 13
            const displayName = item.step_order === 13
              ? 'Planilha de Controle de Pedidos atualizada'
              : item.name;

            return (
              <div
                key={item.id}
                className={`p-3 flex items-start gap-3 transition-colors ${
                  isActive   ? 'bg-neutral-600' :
                  isSkipped  ? 'opacity-50' :
                  isBlocked  ? 'opacity-60' : ''
                }`}
              >
                {/* Ícone de status */}
                <div className="pt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : isSkipped ? (
                    <SkipForward className="h-5 w-5 text-neutral-500" />
                  ) : isActive ? (
                    <Circle className="h-5 w-5 text-white" />
                  ) : (
                    <Lock className="h-5 w-5 text-neutral-500" />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">

                    {/* Nome + badges de área e responsável */}
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${
                        isCompleted ? 'line-through text-neutral-500' :
                        isSkipped   ? 'text-neutral-500' : 'text-white'
                      }`}>
                        <span className="text-xs text-neutral-400 mr-1.5 font-semibold tabular-nums">
                          {item.step_order}.
                        </span>
                        {displayName}
                        {item.step_order === 5 && (
                          <span className="ml-2 text-[10px] text-neutral-400 font-normal">(se houver)</span>
                        )}
                      </p>

                      {/* Área + pessoa atribuída */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <AreaBadge area={item.responsible_area} />
                        {assignedName && (
                          <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                            <User className="h-2.5 w-2.5" />
                            {assignedName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge + prazo */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {/* Badge de estado */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isCompleted ? 'bg-green-600/20 text-green-400' :
                        isSkipped   ? 'bg-neutral-600 text-neutral-400' :
                        isActive    ? 'bg-white text-neutral-900' :
                        'border border-neutral-600 text-neutral-500'
                      }`}>
                        {isCompleted ? 'Concluído' :
                         isSkipped   ? 'Pulado' :
                         isActive    ? 'Ativo' : `Etapa ${item.step_order}`}
                      </span>

                      {/* Badge de prazo (apenas ativo/bloqueado com due_date) */}
                      {deadline && !isSkipped && (
                        <span style={{
                          background: deadline.bgColor,
                          color: deadline.color,
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '1px 7px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          {deadline.isOverdue && <TrendingDown style={{ width: '10px', height: '10px' }} />}
                          {!deadline.isOverdue && <Clock style={{ width: '10px', height: '10px' }} />}
                          {deadline.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info de conclusão */}
                  {isCompleted && item.completed_at && (
                    <div className="mt-1.5 text-[10px] text-neutral-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(item.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {completedByName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {completedByName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notas */}
                  {item.notes && (
                    <p className="mt-1.5 text-xs text-neutral-300 bg-neutral-700 px-2 py-1.5 rounded border border-neutral-600">
                      {item.notes}
                    </p>
                  )}

                  {/* Botão pular — só para etapa 5 quando ativa */}
                  {isSkippable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs text-neutral-400 hover:text-white hover:bg-neutral-500 gap-1.5"
                      onClick={() => handleSkipStep(item.id, item.name)}
                      disabled={skippingId === item.id}
                    >
                      {skippingId === item.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <SkipForward className="h-3 w-3" />
                      }
                      Não há RT neste contrato — pular etapa
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal de reatribuição ───────────────────────────────────── */}
      {checklistData && (
        <ReassignChecklistProfessionalsModal
          open={reassignModalOpen}
          onOpenChange={setReassignModalOpen}
          checklistId={checklistData.id}
          currentProjetistaId={checklistData.assigned_projetista_id}
          currentLogisticaId={checklistData.assigned_logistica_id}
          currentCsId={(checklistData as any).assigned_cs_id}
          currentApresentacaoProjetistaId={(checklistData as any).assigned_apresentacao_projetista_id}
        />
      )}
    </div>
  );
}
