/**
 * GestoraDashboard — Dashboard unificado para a gestora
 *
 * Visão do funil completo com alertas cruzados entre departamentos.
 * Acessível via /gestora (rota admin-only).
 *
 * Adicionar ao App.tsx:
 *   import GestoraDashboard from '@/pages/GestoraDashboard';
 *   <Route path="/gestora" element={<AdminRoute><GestoraDashboard /></AdminRoute>} />
 *
 * Adicionar ao Layout.tsx (apenas para admins):
 *   { path: '/gestora', label: 'Gestora', area: null } — filtrado por isAdmin
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle, ChevronRight, Wrench, CheckCircle2, ClipboardList,
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  clientName?: string;
  clientId?: string;
  days: number;
}

interface ContractStepRow {
  checklistId: string;
  projectId: string;
  clientId?: string;
  clientName: string;
  foccoNumber?: string;
  stepName: string;
  daysInStep: number;
  isOverdue: boolean;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function GestoraDashboard() {
  const navigate = useNavigate();

  // ── Queries de dados ──────────────────────────────────────────────────────

  const { data: atCases = [] } = useQuery({
    queryKey: ['gestora-at'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technical_assistance')
        .select('*, clients(id, name)')
        .neq('status', 'resolved');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['gestora-checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_checklists')
        .select('*, checklist_items(id, name, status, due_date, updated_at, step_order), projects(id, clients(id, name), focco_project_number)')
        .eq('is_completed', false);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Alertas: ATs ──────────────────────────────────────────────────────────

  const atAlerts = useMemo((): Alert[] => {
    const today = new Date();
    return atCases
      .map((at: any): Alert => {
        const ref = at.opened_date || at.created_at;
        const dias = ref ? differenceInBusinessDays(today, parseISO(ref)) : 0;
        return {
          id: `at-${at.id}`,
          type: dias >= 7 ? 'danger' : dias >= 3 ? 'warning' : 'info',
          title: at.title || 'Assistência técnica',
          detail: `Aberta há ${dias} dia(s) úteis`,
          clientName: at.clients?.name,
          clientId: at.clients?.id,
          days: dias,
        };
      })
      .sort((a, b) => b.days - a.days);
  }, [atCases]);

  // ── Alertas: PEDIDOS (etapas de checklist atrasadas) ─────────────────────

  const pedidoAlerts = useMemo((): Alert[] => {
    const today = new Date();
    const list: Alert[] = [];
    checklists.forEach((cl: any) => {
      const overdueItems = (cl.checklist_items || []).filter((item: any) => {
        if (item.status === 'completed' || item.status === 'skipped') return false;
        if (!item.due_date) return false;
        return differenceInBusinessDays(today, parseISO(item.due_date)) > 0;
      });
      if (overdueItems.length === 0) return;
      const maisAntigo = overdueItems.sort((a: any, b: any) =>
        a.due_date.localeCompare(b.due_date)
      )[0];
      const dias = differenceInBusinessDays(today, parseISO(maisAntigo.due_date));
      list.push({
        id: `pedido-${cl.id}`,
        type: dias >= 5 ? 'danger' : 'warning',
        title: `${overdueItems.length} etapa(s) em atraso`,
        detail: `${maisAntigo.name} — ${dias} dia(s) úteis${cl.projects?.focco_project_number ? ` · FOCCO ${cl.projects.focco_project_number}` : ''}`,
        clientName: cl.projects?.clients?.name,
        clientId: cl.projects?.clients?.id,
        days: dias,
      });
    });
    return list.sort((a, b) => b.days - a.days);
  }, [checklists]);

  // ── Contador por contrato: etapa atual + dias úteis na etapa ─────────────

  const contractSteps = useMemo((): ContractStepRow[] => {
    const today = new Date();
    const rows: ContractStepRow[] = [];
    checklists.forEach((cl: any) => {
      const items = (cl.checklist_items || []) as any[];
      // Etapa atual = primeira ativa, ou primeira não concluída ordenada por step_order
      const sorted = [...items].sort((a, b) => (a.step_order || 0) - (b.step_order || 0));
      const current =
        sorted.find(i => i.status === 'active') ||
        sorted.find(i => i.status !== 'completed' && i.status !== 'skipped');
      if (!current) return;
      const ref = current.updated_at || cl.updated_at;
      const dias = ref ? differenceInBusinessDays(today, parseISO(ref)) : 0;
      const dueDays = current.due_date
        ? differenceInBusinessDays(today, parseISO(current.due_date))
        : 0;
      rows.push({
        checklistId: cl.id,
        projectId: cl.project_id,
        clientId: cl.projects?.clients?.id,
        clientName: cl.projects?.clients?.name || '—',
        foccoNumber: cl.projects?.focco_project_number,
        stepName: current.name,
        daysInStep: dias,
        isOverdue: dueDays > 0,
      });
    });
    return rows.sort((a, b) => b.daysInStep - a.daysInStep);
  }, [checklists]);

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="section-title">VISÃO DA GESTORA</h1>
        <p className="text-xs text-muted-foreground tracking-wide">
          Funil completo · {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* ── Especificadores: % por categoria ───────────────────────── */}
      <div>
        <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium mb-2">
          Especificadores ({especMix.total})
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Encantado', data: especMix.encantado, color: '#1D9E75' },
            { label: 'Curioso',   data: especMix.curioso,   color: '#EF9F27' },
            { label: 'Distante',  data: especMix.distante,  color: '#E24B4A' },
          ].map(item => (
            <div key={item.label} className="border border-border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {item.label}
              </div>
              <div className="text-2xl font-light tabular-nums" style={{ color: item.color }}>
                {item.data.pct}%
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {item.data.count} especificador(es)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Funil visual ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {funnel.map(stage => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              className="border border-border rounded-lg p-3 hover:border-foreground/30 transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="h-3.5 w-3.5" style={{ color: stage.color }} />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">
                  {stage.label}
                </span>
              </div>
              <div className="text-2xl font-light tabular-nums" style={{ color: stage.color }}>
                {stage.count}
              </div>
              {stage.value !== undefined && stage.value > 0 && (
                <div className="text-xs text-muted-foreground mt-0.5">{fmtBRL(stage.value)}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Alertas cruzados ───────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Alertas
            {alerts.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </h2>

          {alerts.length === 0 ? (
            <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground text-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
              Nenhum alerta no momento
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-3 flex items-start justify-between gap-3 ${
                    alert.type === 'danger'  ? 'border-red-200 bg-red-50 dark:bg-red-900/10' :
                    alert.type === 'warning' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10' :
                    'border-blue-200 bg-blue-50 dark:bg-blue-900/10'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${
                      alert.type === 'danger'  ? 'text-red-700 dark:text-red-400' :
                      alert.type === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                      'text-blue-700 dark:text-blue-400'
                    }`}>
                      {alert.title}
                    </p>
                    {alert.clientName && (
                      <p className="text-xs font-medium text-foreground mt-0.5">{alert.clientName}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
                  </div>
                  {alert.clientId && (
                    <button
                      onClick={() => navigate(`/cliente/${alert.clientId}`)}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      Ver <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Ranking de consultores ──────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
            Consultores — mês atual
          </h2>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {['Consultor', 'Ações', 'Negoc.', 'Vendas', 'Valor', 'CS atras.'].map(h => (
                    <th key={h} className="p-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground first:pl-3 last:pr-3">
                      {h}
                    </th>
                  ))}
                  <th className="p-2 w-6" />
                </tr>
              </thead>
              <tbody>
                {consultorMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-xs text-muted-foreground">
                      Nenhuma atividade registrada este mês
                    </td>
                  </tr>
                ) : consultorMetrics.map(m => (
                  <tr key={m.id} className="border-t border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="p-2 pl-3 font-medium text-sm truncate max-w-[120px]">{m.name}</td>
                    <td className="p-2 tabular-nums text-xs">{m.acoesMes}</td>
                    <td className="p-2 tabular-nums text-xs">{m.emNegociacao}</td>
                    <td className="p-2 tabular-nums text-xs text-green-600 font-medium">{m.vendidosMes}</td>
                    <td className="p-2 tabular-nums text-xs">{fmtBRL(m.valorMes)}</td>
                    <td className={`p-2 tabular-nums text-xs ${m.csAtrasados > 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                      {m.csAtrasados > 0 ? m.csAtrasados : '—'}
                    </td>
                    <td className="p-2 pr-3">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Projetos em produção sem entrega há muito tempo ───────────── */}
      {(() => {
        const semEntrega = projects
          .filter((p: any) =>
            p.stage === 'closed_won' &&
            !p.actual_delivery &&
            p.closed_date &&
            differenceInDays(new Date(), parseISO(p.closed_date)) > 60
          )
          .sort((a: any, b: any) =>
            (b.closed_date || '').localeCompare(a.closed_date || '')
          )
          .slice(0, 10);

        if (semEntrega.length === 0) return null;

        return (
          <div className="space-y-3">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Vendas sem entrega há mais de 60 dias ({semEntrega.length})
            </h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    {['Cliente', 'FOCCO', 'Consultor', 'Data venda', 'Dias em produção'].map(h => (
                      <th key={h} className="p-2 pl-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                        {h}
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {semEntrega.map((p: any) => {
                    const dias = differenceInDays(new Date(), parseISO(p.closed_date));
                    return (
                      <tr key={p.id} className="border-t border-border/50 hover:bg-muted/10">
                        <td className="p-2 pl-3 font-medium text-sm">{p.clients?.name || '—'}</td>
                        <td className="p-2 text-xs text-muted-foreground">{p.focco_project_number || '—'}</td>
                        <td className="p-2 text-xs text-muted-foreground">{p.responsible?.name || '—'}</td>
                        <td className="p-2 text-xs text-muted-foreground">{fmtDate(p.closed_date)}</td>
                        <td className="p-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            dias > 120 ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          }`}>
                            {dias} dias
                          </span>
                        </td>
                        <td className="p-2 pr-3 text-right">
                          {p.clients?.id && (
                            <button
                              onClick={() => navigate(`/cliente/${p.clients.id}`)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
