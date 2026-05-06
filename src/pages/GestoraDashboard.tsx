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
        .eq('status', 'open');
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

      {/* ── Alertas: ATs e PEDIDOS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertColumn
          title="ATs"
          icon={<Wrench className="h-3.5 w-3.5 text-red-500" />}
          alerts={atAlerts}
          onNavigate={(id) => navigate(`/cliente/${id}`)}
        />
        <AlertColumn
          title="Pedidos (Checklist)"
          icon={<ClipboardList className="h-3.5 w-3.5 text-red-500" />}
          alerts={pedidoAlerts}
          onNavigate={(id) => navigate(`/cliente/${id}`)}
        />
      </div>

      {/* ── Etapa atual por contrato ─────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" />
          Contratos · etapa atual (dias úteis)
          <span className="text-muted-foreground/60">({contractSteps.length})</span>
        </h2>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20 border-b border-border">
                {['Cliente', 'FOCCO', 'Etapa atual', 'Dias úteis'].map(h => (
                  <th key={h} className="p-2 pl-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                    {h}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {contractSteps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">
                    Nenhum contrato em andamento.
                  </td>
                </tr>
              ) : contractSteps.map(row => (
                <tr key={row.checklistId} className="border-t border-border/50 hover:bg-muted/10">
                  <td className="p-2 pl-3 font-medium text-sm">{row.clientName}</td>
                  <td className="p-2 text-xs text-muted-foreground">{row.foccoNumber || '—'}</td>
                  <td className={`p-2 text-xs ${row.isOverdue ? "text-red-500" : ""}`}>{row.stepName}</td>
                  <td className="p-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      row.daysInStep >= 10 || row.isOverdue
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : row.daysInStep >= 5
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {row.daysInStep} d.u.
                    </span>
                  </td>
                  <td className="p-2 pr-3 text-right">
                    {row.clientId && (
                      <button
                        onClick={() => navigate(`/cliente/${row.clientId}`)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ── Componente auxiliar: coluna de alertas ─────────────────────────────────

function AlertColumn({
  title, icon, alerts, onNavigate,
}: {
  title: string;
  icon: React.ReactNode;
  alerts: Alert[];
  onNavigate: (clientId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        {title}
        {icon}
        {alerts.length > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {alerts.length}
          </span>
        )}
      </h2>

      {alerts.length === 0 ? (
        <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground text-center">
          <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
          Nenhum alerta
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
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white mt-0.5">{alert.clientName}</p>
                )}
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5">{alert.detail}</p>
              </div>
              {alert.clientId && (
                <button
                  onClick={() => onNavigate(alert.clientId!)}
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
  );
}
