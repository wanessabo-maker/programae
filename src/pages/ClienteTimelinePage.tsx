/**
 * ClienteTimelinePage
 *
 * Linha do tempo unificada do cliente — mostra toda a jornada:
 * Especificador → Relacionamentos → Apresentações → Venda →
 * Checklist pós-venda → Entrega → CS → Assistência Técnica
 *
 * Acessível via: /cliente/:clientId
 * Também pode ser aberto via modal a partir de Contratos ou CS.
 *
 * Adicionar ao App.tsx:
 *   import ClienteTimelinePage from '@/pages/ClienteTimelinePage';
 *   <Route path="/cliente/:clientId" element={<ProtectedRoute><ClienteTimelinePage /></ProtectedRoute>} />
 *
 * Adicionar ao Layout.tsx nav (opcional — ou deixar só como deep link):
 *   Nenhuma nav item necessária: é acessado por link direto dos outros módulos.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, User, Building2, FileText, CheckCircle2,
  Clock, AlertTriangle, Package, HeartHandshake, Wrench,
  TrendingUp, Calendar,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  date: string;
  type: 'especificador' | 'relacionamento' | 'apresentacao' | 'venda' |
        'checklist' | 'entrega' | 'cs' | 'at';
  title: string;
  subtitle?: string;
  detail?: string;
  actor?: string;      // nome de quem fez
  area: 'comercial' | 'projetos' | 'logistica' | 'cs' | 'at';
  isAlert?: boolean;
  value?: number;
}

// ── Cores por área ────────────────────────────────────────────────────────────

const AREA_STYLE: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
  comercial: { dot: '#7F77DD', bg: '#EEEDFE', text: '#534AB7', border: '#AFA9EC', label: 'Comercial' },
  projetos:  { dot: '#EF9F27', bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', label: 'Projetos' },
  logistica: { dot: '#1D9E75', bg: '#E1F5EE', text: '#0F6E56', border: '#5DCAA5', label: 'Logística' },
  cs:        { dot: '#378ADD', bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB', label: 'CS' },
  at:        { dot: '#E24B4A', bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', label: 'Assist. Técnica' },
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function ClienteTimelinePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  // ── Buscar todos os dados do cliente ──────────────────────────────────────

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client-timeline-client', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*, professionals(name, professional_types(name)), responsible:team_members!clients_responsible_id_fkey(name)')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['client-timeline-projects', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, responsible:team_members!projects_responsible_id_fkey(name)')
        .eq('client_id', clientId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['client-timeline-actions', clientId],
    queryFn: async () => {
      if (!projects.length) return [];
      const projectIds = projects.map((p: any) => p.id);
      const { data, error } = await supabase
        .from('actions')
        .select('*, action_types(name, classification), team_members(name)')
        .or(`project_id.in.(${projectIds.join(',')}),client_id.eq.${clientId}`)
        .order('action_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && projects.length > 0,
  });

  const { data: csCases = [] } = useQuery({
    queryKey: ['client-timeline-cs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_cases')
        .select('*, cs_actions(*, schedule:cs_contact_schedules(name, days_after_signature), performed_by:team_members(name))')
        .eq('client_id', clientId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: atCases = [] } = useQuery({
    queryKey: ['client-timeline-at', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technical_assistance')
        .select('*, responsible:team_members!technical_assistance_responsible_id_fkey(name)')
        .eq('client_id', clientId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ['client-timeline-checklist', clientId],
    queryFn: async () => {
      if (!projects.length) return [];
      const projectIds = projects.map((p: any) => p.id);
      const { data, error } = await supabase
        .from('contract_checklists')
        .select('*, checklist_items(*)')
        .in('project_id', projectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && projects.length > 0,
  });

  // ── Montar a timeline ────────────────────────────────────────────────────

  const timeline = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 1. Especificador vinculado
    if (client?.professionals?.name) {
      events.push({
        id: 'esp-0',
        date: client.created_at || '',
        type: 'especificador',
        title: 'Especificador vinculado',
        subtitle: client.professionals.name,
        detail: client.professionals.professional_types?.name,
        area: 'comercial',
      });
    }

    // 2. Ações de relacionamento e comerciais
    actions.forEach((a: any) => {
      const classification = a.action_types?.classification;
      const name = a.action_types?.name || '';
      const actor = a.team_members?.name;

      if (classification === 'relacionamento') {
        events.push({
          id: `action-${a.id}`,
          date: a.action_date,
          type: 'relacionamento',
          title: name,
          subtitle: actor,
          area: 'comercial',
          actor,
        });
      } else if (classification === 'apresentacao' || name.toLowerCase().includes('apresentação de projeto')) {
        events.push({
          id: `action-${a.id}`,
          date: a.action_date,
          type: 'apresentacao',
          title: `Apresentação de Projeto nº ${a.presentation_number || '?'}`,
          subtitle: actor,
          detail: a.value ? `R$ ${Number(a.value).toLocaleString('pt-BR')}` : undefined,
          area: 'comercial',
          actor,
          value: a.value,
        });
      } else if (classification === 'venda') {
        events.push({
          id: `action-${a.id}`,
          date: a.action_date,
          type: 'venda',
          title: 'Venda fechada',
          subtitle: actor,
          detail: a.value ? `R$ ${Number(a.value).toLocaleString('pt-BR')}` : undefined,
          area: 'comercial',
          actor,
          value: a.value,
        });
      }
    });

    // 3. Etapas do checklist concluídas
    checklistItems.forEach((cl: any) => {
      (cl.checklist_items || [])
        .filter((item: any) => item.status === 'completed' && item.completed_at)
        .forEach((item: any) => {
          const area = item.responsible_area === 'projetista_tecnico' ? 'projetos'
            : item.responsible_area === 'logistica' ? 'logistica'
            : item.responsible_area === 'cs' ? 'cs' : 'comercial';
          events.push({
            id: `checklist-${item.id}`,
            date: item.completed_at.split('T')[0],
            type: 'checklist',
            title: item.name,
            subtitle: `Etapa ${item.step_order} de 18`,
            area: area as any,
          });
        });
    });

    // 4. Entrega do projeto
    projects.forEach((p: any) => {
      if (p.actual_delivery) {
        events.push({
          id: `delivery-${p.id}`,
          date: p.actual_delivery,
          type: 'entrega',
          title: 'Pedido entregue',
          subtitle: p.focco_project_number ? `FOCCO ${p.focco_project_number}` : undefined,
          area: 'logistica',
        });
      }
    });

    // 5. Contatos de CS
    csCases.forEach((csCase: any) => {
      (csCase.cs_actions || []).forEach((csAction: any) => {
        const isCompleted = csAction.status === 'completed';
        events.push({
          id: `cs-${csAction.id}`,
          date: isCompleted ? (csAction.completed_date || csAction.scheduled_date) : csAction.scheduled_date,
          type: 'cs',
          title: csAction.schedule?.name || 'Contato CS',
          subtitle: isCompleted
            ? `Realizado por ${csAction.performed_by?.name || '—'}`
            : `Agendado para ${format(parseISO(csAction.scheduled_date), 'dd/MM/yyyy', { locale: ptBR })}`,
          area: 'cs',
          isAlert: !isCompleted && new Date(csAction.scheduled_date) < new Date(),
        });
      });
    });

    // 6. Assistência Técnica
    atCases.forEach((at: any) => {
      events.push({
        id: `at-${at.id}`,
        date: at.opened_date || at.created_at,
        type: 'at',
        title: at.title,
        subtitle: `${at.priority === 'high' ? 'Alta prioridade' : at.priority} · ${at.status}`,
        detail: at.responsible?.name,
        area: 'at',
        isAlert: at.status !== 'resolved',
      });
    });

    // Ordenar cronologicamente
    return events.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }, [client, actions, checklistItems, projects, csCases, atCases]);

  // ── KPIs do cliente ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const apresentacoes = timeline.filter(e => e.type === 'apresentacao').length;
    const vendas = timeline.filter(e => e.type === 'venda');
    const valorVendido = vendas.reduce((s, e) => s + (e.value || 0), 0);
    const relacionamentos = timeline.filter(e => e.type === 'relacionamento').length;
    const atAbertos = atCases.filter((at: any) => at.status !== 'resolved').length;
    const csAtrasados = timeline.filter(e => e.type === 'cs' && e.isAlert).length;

    const firstEvent = timeline.find(e => e.date);
    const lastEvent = [...timeline].reverse().find(e => e.date);
    const diasRelacionamento = firstEvent && lastEvent
      ? differenceInDays(parseISO(lastEvent.date), parseISO(firstEvent.date))
      : 0;

    return { apresentacoes, valorVendido, relacionamentos, atAbertos, csAtrasados, diasRelacionamento };
  }, [timeline, atCases]);

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Clock className="h-5 w-5 animate-spin mr-2" /> Carregando...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        Cliente não encontrado.
      </div>
    );
  }

  const fmtDate = (d?: string) =>
    d ? format(parseISO(d), "dd 'de' MMM yyyy", { locale: ptBR }) : '—';

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="mt-1 p-2 hover:bg-muted rounded transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="section-title">{client.name}</h1>
          <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
            {client.professionals?.name && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Especificador: {client.professionals.name}
              </span>
            )}
            {client.responsible?.name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Consultor: {client.responsible.name}
              </span>
            )}
            {client.profession && (
              <span>{client.profession}</span>
            )}
            {client.age && (
              <span>{client.age} anos</span>
            )}
          </div>
        </div>
        {projects[0]?.stage === 'closed_won' && (
          <span className="text-xs bg-green-500/10 text-green-600 border border-green-500/20 px-3 py-1 rounded-full font-medium">
            ✓ Vendido
          </span>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Relacionamentos', value: kpis.relacionamentos, icon: HeartHandshake },
          { label: 'Apresentações', value: kpis.apresentacoes, icon: FileText },
          { label: 'Valor vendido', value: kpis.valorVendido > 0 ? `R$ ${(kpis.valorVendido/1000).toFixed(0)}k` : '—', icon: TrendingUp },
          { label: 'Dias de jornada', value: kpis.diasRelacionamento, icon: Calendar },
          { label: 'CS atrasados', value: kpis.csAtrasados, icon: Clock, alert: kpis.csAtrasados > 0 },
          { label: 'AT em aberto', value: kpis.atAbertos, icon: Wrench, alert: kpis.atAbertos > 0 },
        ].map(({ label, value, icon: Icon, alert }) => (
          <div
            key={label}
            className={`border p-3 rounded-lg ${alert ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-border'}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              <Icon className={`h-3 w-3 ${alert ? 'text-red-500' : ''}`} />
              {label}
            </div>
            <div className={`text-xl font-light tabular-nums ${alert ? 'text-red-500' : ''}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-1">
          {timeline.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhum evento registrado para este cliente ainda.
            </div>
          )}

          {timeline.map((event, idx) => {
            const style = AREA_STYLE[event.area];
            const showDateLabel = idx === 0 ||
              timeline[idx - 1].date?.slice(0, 7) !== event.date?.slice(0, 7);

            return (
              <div key={event.id}>
                {/* Separador de mês */}
                {showDateLabel && event.date && (
                  <div className="flex items-center gap-3 py-2 ml-12">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium capitalize">
                      {format(parseISO(event.date), "MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <div className="flex items-start gap-4 py-1.5">
                  {/* Dot na linha */}
                  <div className="relative z-10 shrink-0 w-10 flex justify-center">
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 ring-2 ring-background"
                      style={{ background: event.isAlert ? '#E24B4A' : style.dot }}
                    />
                  </div>

                  {/* Card do evento */}
                  <div className={`flex-1 min-w-0 rounded-lg border px-3 py-2 mb-1 ${
                    event.isAlert ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : 'border-border bg-card'
                  }`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">
                          {event.isAlert && <AlertTriangle className="h-3.5 w-3.5 text-red-500 inline mr-1.5" />}
                          {event.title}
                        </p>
                        {event.subtitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">{event.subtitle}</p>
                        )}
                        {event.detail && (
                          <p className="text-xs font-medium mt-0.5" style={{ color: style.text }}>
                            {event.detail}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ background: style.bg, color: style.text, border: `0.5px solid ${style.border}` }}
                        >
                          {style.label}
                        </span>
                        {event.date && (
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDate(event.date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
