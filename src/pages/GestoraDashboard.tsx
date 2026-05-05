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
import { format, parseISO, differenceInDays, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import {
  AlertTriangle, TrendingUp, Users, FileText,
  Package, HeartHandshake, Clock, ChevronRight,
  Wrench, CheckCircle2,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FunnelStage {
  id: string;
  label: string;
  count: number;
  value?: number;
  color: string;
  icon: React.ComponentType<any>;
}

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  clientName?: string;
  clientId?: string;
  actionLabel?: string;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function GestoraDashboard() {
  const navigate = useNavigate();
  const { teamMembers, actions, actionTypes } = useApp();

  // ── Queries de dados ──────────────────────────────────────────────────────

  const { data: projects = [] } = useQuery({
    queryKey: ['gestora-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(id, name), responsible:team_members!projects_responsible_id_fkey(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: csCases = [] } = useQuery({
    queryKey: ['gestora-cs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_cases')
        .select('*, cs_actions(id, scheduled_date, status, completed_date), clients(id, name)')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

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
        .select('*, checklist_items(id, name, status, due_date, responsible_area), projects(id, clients(id, name), focco_project_number)')
        .eq('is_completed', false);
      if (error) throw error;
      return data || [];
    },
  });

  // All professionals + their categories (for Encantado/Curioso/Distante distribution)
  const { data: profData = { professionals: [], categories: [] } } = useQuery({
    queryKey: ['gestora-professionals-with-categories'],
    queryFn: async () => {
      const [profsRes, catsRes] = await Promise.all([
        supabase.from('professionals').select('id, name, last_action_date, category_id'),
        supabase.from('professional_categories').select('id, name'),
      ]);
      return {
        professionals: profsRes.data || [],
        categories: catsRes.data || [],
      };
    },
  });
  const professionals = profData.professionals;

  // Compute % per category
  const especMix = useMemo(() => {
    const total = professionals.length;
    const findCat = (kw: string) => profData.categories.find((c: any) => c.name?.toLowerCase().includes(kw))?.id;
    const encId = findCat('encantado');
    const curId = findCat('curioso');
    const distId = findCat('distante');
    const count = (id?: string) => id ? professionals.filter((p: any) => p.category_id === id).length : 0;
    const enc = count(encId);
    const cur = count(curId);
    const dist = count(distId);
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
    return {
      total,
      encantado: { count: enc, pct: pct(enc) },
      curioso:   { count: cur, pct: pct(cur) },
      distante:  { count: dist, pct: pct(dist) },
    };
  }, [professionals, profData.categories]);

  // ── Funil ─────────────────────────────────────────────────────────────────

  const funnel = useMemo((): FunnelStage[] => {
    const apresentacaoTypeIds = new Set(
      actionTypes
        .filter(t => t.name?.toLowerCase().includes('apresentação de projeto') || t.name?.toLowerCase().includes('apresentacao de projeto'))
        .map(t => t.id)
    );

    // Especificadores com ação este mês
    const activeSpecs = new Set(
      actions
        .filter(a => isThisMonth(parseISO(a.date)))
        .map(a => a.professionalId)
        .filter(Boolean)
    ).size;

    // Apresentações este mês
    const apresentacoesMonth = actions.filter(a =>
      isThisMonth(parseISO(a.date)) && apresentacaoTypeIds.has(a.actionTypeId)
    ).length;

    // Projetos em negociação
    const emNegociacao = projects.filter(p => p.stage === 'em_negociacao');

    // Vendas este mês
    const vendidos = projects.filter(p =>
      p.stage === 'closed_won' && p.closed_date && isThisMonth(parseISO(p.closed_date))
    );
    const valorVendidoMes = vendidos.reduce((s: number, p: any) => s + (p.closed_value || 0), 0);

    // Em produção (closed_won mas sem entrega)
    const emProducao = projects.filter(p =>
      p.stage === 'closed_won' && !p.actual_delivery
    );

    // Entregues este mês
    const entregues = projects.filter(p =>
      p.actual_delivery && isThisMonth(parseISO(p.actual_delivery))
    );

    return [
      { id: 'specs',       label: 'Especificadores ativos', count: activeSpecs,          color: '#7F77DD', icon: Users },
      { id: 'apres',       label: 'Apresentações no mês',   count: apresentacoesMonth,   color: '#7F77DD', icon: FileText },
      { id: 'negociacao',  label: 'Em negociação',          count: emNegociacao.length,  color: '#EF9F27', icon: TrendingUp },
      { id: 'vendidos',    label: 'Vendidos no mês',        count: vendidos.length,      color: '#1D9E75', icon: CheckCircle2, value: valorVendidoMes },
      { id: 'producao',    label: 'Em produção',            count: emProducao.length,    color: '#378ADD', icon: Package },
      { id: 'entregues',   label: 'Entregues no mês',       count: entregues.length,     color: '#1D9E75', icon: Package },
      { id: 'cs_ativo',    label: 'CS ativo',               count: csCases.length,       color: '#378ADD', icon: HeartHandshake },
      { id: 'at_aberto',   label: 'AT em aberto',           count: atCases.length,       color: '#E24B4A', icon: Wrench },
    ];
  }, [projects, csCases, atCases, actions, actionTypes]);

  // ── Alertas cruzados ──────────────────────────────────────────────────────

  const alerts = useMemo((): Alert[] => {
    const list: Alert[] = [];
    const today = new Date();

    // 1. Vendas sem CS aberto após 30 dias
    projects.forEach((p: any) => {
      if (p.stage !== 'closed_won' || !p.actual_delivery) return;
      const daysSince = differenceInDays(today, parseISO(p.actual_delivery));
      if (daysSince < 1) return;
      const hasCS = csCases.some((c: any) => c.project_id === p.id || c.client_id === p.clients?.id);
      if (!hasCS) {
        list.push({
          id: `no-cs-${p.id}`,
          type: 'danger',
          title: 'Entrega sem CS aberto',
          detail: `Entregue há ${daysSince} dias sem caso CS`,
          clientName: p.clients?.name,
          clientId: p.clients?.id,
          actionLabel: 'Abrir CS',
        });
      }
    });

    // 2. Contatos de CS atrasados
    csCases.forEach((csCase: any) => {
      const atrasados = (csCase.cs_actions || []).filter((a: any) => {
        if (a.status === 'completed') return false;
        return differenceInDays(today, parseISO(a.scheduled_date)) > 0;
      });
      if (atrasados.length > 0) {
        const maisAtrasado = atrasados.sort((a: any, b: any) =>
          a.scheduled_date.localeCompare(b.scheduled_date)
        )[0];
        const dias = differenceInDays(today, parseISO(maisAtrasado.scheduled_date));
        list.push({
          id: `cs-late-${csCase.id}`,
          type: 'warning',
          title: 'Contato CS atrasado',
          detail: `${atrasados.length} contato(s) atrasado(s) — mais antigo há ${dias} dias`,
          clientName: csCase.clients?.name,
          clientId: csCase.clients?.id,
          actionLabel: 'Ver CS',
        });
      }
    });

    // 3. Checklist com etapas atrasadas
    checklists.forEach((cl: any) => {
      const overdueItems = (cl.checklist_items || []).filter((item: any) => {
        if (item.status === 'completed' || item.status === 'skipped') return false;
        if (!item.due_date) return false;
        return differenceInDays(today, parseISO(item.due_date)) > 0;
      });
      if (overdueItems.length > 0) {
        const clientName = cl.projects?.clients?.name;
        list.push({
          id: `checklist-${cl.id}`,
          type: 'warning',
          title: 'Tarefas de checklist em atraso',
          detail: `${overdueItems.length} etapa(s) atrasada(s)${cl.projects?.focco_project_number ? ` — FOCCO ${cl.projects.focco_project_number}` : ''}`,
          clientName,
          clientId: cl.projects?.clients?.id,
          actionLabel: 'Ver contrato',
        });
      }
    });

    // 3b. Apresentação pausada (AGUARDANDO_INICIO) há mais de 5 dias
    projects.forEach((p: any) => {
      if (p.planner_status !== 'AGUARDANDO_INICIO') return;
      const ref = p.planner_data_aguardando || p.planner_status_at;
      if (!ref) return;
      const dias = differenceInDays(today, parseISO(ref));
      if (dias > 5) {
        list.push({
          id: `apres-pausada-${p.id}`,
          type: 'warning',
          title: 'Apresentação pausada há +5 dias',
          detail: `Aguardando início há ${dias} dias${p.focco_project_number ? ` — FOCCO ${p.focco_project_number}` : ''}`,
          clientName: p.clients?.name,
          clientId: p.clients?.id,
          actionLabel: 'Ver projeto',
        });
      }
    });

    // 3c. Apresentação concluída há mais de 5 dias sem venda
    projects.forEach((p: any) => {
      if (p.planner_status !== 'CONCLUIDO') return;
      const ref = p.planner_data_concluido || p.planner_status_at;
      if (!ref) return;
      const dias = differenceInDays(today, parseISO(ref));
      if (dias > 5) {
        list.push({
          id: `apres-concluida-${p.id}`,
          type: 'warning',
          title: 'Apresentação concluída há +5 dias',
          detail: `Concluída há ${dias} dias sem venda${p.focco_project_number ? ` — FOCCO ${p.focco_project_number}` : ''}`,
          clientName: p.clients?.name,
          clientId: p.clients?.id,
          actionLabel: 'Ver projeto',
        });
      }
    });

    // 3d. ATs abertas (qualquer prioridade)
    atCases.forEach((at: any) => {
      const dias = differenceInDays(today, parseISO(at.opened_date || at.created_at));
      list.push({
        id: `at-open-${at.id}`,
        type: dias >= 7 ? 'danger' : 'info',
        title: 'AT em aberto',
        detail: `${at.title || 'Assistência técnica'} — aberta há ${dias} dia(s)`,
        clientName: at.clients?.name,
        clientId: at.clients?.id,
        actionLabel: 'Ver AT',
      });
    });

    // 4. AT de alta prioridade aberta há mais de 7 dias
    atCases.forEach((at: any) => {
      if (at.priority !== 'high' && at.priority !== 'urgent') return;
      const dias = differenceInDays(today, parseISO(at.opened_date || at.created_at));
      if (dias >= 7) {
        list.push({
          id: `at-${at.id}`,
          type: 'danger',
          title: 'AT alta prioridade sem resolução',
          detail: `Aberta há ${dias} dias — ${at.title}`,
          clientName: at.clients?.name,
          clientId: at.clients?.id,
          actionLabel: 'Ver AT',
        });
      }
    });

    // 5. Especificadores "Encantados" sem contato há mais de 60 dias
    professionals.slice(0, 5).forEach((prof: any) => {
      if (!prof.last_action_date) return;
      const dias = differenceInDays(today, parseISO(prof.last_action_date));
      if (dias >= 60) {
        list.push({
          id: `spec-${prof.id}`,
          type: 'info',
          title: 'Especificador Encantado sem contato',
          detail: `${prof.name} — último contato há ${dias} dias`,
          actionLabel: 'Ver especificador',
        });
      }
    });

    // Ordenar: danger → warning → info
    const priority = { danger: 0, warning: 1, info: 2 };
    return list.sort((a, b) => priority[a.type] - priority[b.type]);
  }, [projects, csCases, atCases, checklists, professionals]);

  // ── Métricas por consultor ────────────────────────────────────────────────

  const consultorMetrics = useMemo(() => {
    const hoje = new Date();
    return teamMembers
      .filter(m => m.active)
      .map(m => {
        const meusProjects = projects.filter((p: any) => p.responsible_id === m.id);
        const vendidosMes = meusProjects.filter((p: any) =>
          p.stage === 'closed_won' && p.closed_date && isThisMonth(parseISO(p.closed_date))
        );
        const emNegociacaoCount = meusProjects.filter((p: any) => p.stage === 'em_negociacao').length;
        const minhasAcoes = actions.filter(a => a.consultantId === m.id && isThisMonth(parseISO(a.date)));
        const valor = vendidosMes.reduce((s: number, p: any) => s + (p.closed_value || 0), 0);
        const csAtrasados = csCases.filter((c: any) => {
          if (c.responsible_id !== m.id) return false;
          return (c.cs_actions || []).some((a: any) =>
            a.status !== 'completed' && differenceInDays(hoje, parseISO(a.scheduled_date)) > 0
          );
        }).length;

        return {
          id: m.id,
          name: m.name,
          acoesMes: minhasAcoes.length,
          emNegociacao: emNegociacaoCount,
          vendidosMes: vendidosMes.length,
          valorMes: valor,
          csAtrasados,
        };
      })
      .filter(m => m.acoesMes > 0 || m.emNegociacao > 0 || m.vendidosMes > 0)
      .sort((a, b) => b.valorMes - a.valorMes);
  }, [teamMembers, projects, actions, csCases]);

  const fmtBRL = (v: number) =>
    v > 0 ? `R$ ${(v / 1000).toFixed(0)}k` : '—';

  const fmtDate = (d?: string) =>
    d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

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
