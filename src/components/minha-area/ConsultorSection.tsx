import { useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjects } from '@/hooks/useProjects';
import { useActions } from '@/hooks/useDatabase';
import IndicadoresTab from '@/components/comercial/IndicadoresTab';
import { Briefcase, TrendingUp, Activity, Wallet } from 'lucide-react';

interface Props {
  teamMemberId: string;
  teamMemberName: string;
}

const PIPELINE_COLUMNS: { key: string; label: string; dateField: string }[] = [
  { key: 'AGUARDANDO_INICIO', label: 'Aguardando Início', dateField: 'planner_data_aguardando' },
  { key: 'INICIADO', label: 'Iniciado', dateField: 'planner_data_iniciado' },
  { key: 'CONCLUIDO', label: 'Concluído', dateField: 'planner_data_concluido' },
  { key: 'EM_REFORMA', label: 'Em Reforma', dateField: 'planner_status_at' },
  { key: 'PAUSADO', label: 'Pausado', dateField: 'planner_data_pausado' },
  { key: 'VENDIDO', label: 'Vendido', dateField: 'planner_data_vendido' },
];

const ACTIVE_STATUSES = new Set([
  'AGUARDANDO_INICIO', 'INICIADO', 'CONCLUIDO', 'EM_REFORMA', 'PAUSADO',
]);

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function ConsultorSection({ teamMemberId, teamMemberName }: Props) {
  const { data: allProjects = [] } = useProjects();
  const { data: allActions = [] } = useActions();

  const myProjects = useMemo(
    () => (allProjects || []).filter((p: any) => p.responsible_id === teamMemberId),
    [allProjects, teamMemberId]
  );

  const projectsByStatus = useMemo(() => {
    const map: Record<string, any[]> = {};
    PIPELINE_COLUMNS.forEach(c => (map[c.key] = []));
    myProjects.forEach((p: any) => {
      const s = p.planner_status as string | null;
      if (s && map[s]) map[s].push(p);
    });
    // Sort each column by date ascending (oldest first → maior tempo na coluna)
    PIPELINE_COLUMNS.forEach(c => {
      map[c.key].sort((a: any, b: any) => {
        const da = a[c.dateField] ? new Date(a[c.dateField]).getTime() : 0;
        const db = b[c.dateField] ? new Date(b[c.dateField]).getTime() : 0;
        return da - db;
      });
    });
    return map;
  }, [myProjects]);

  const carteiraFlutuante = useMemo(() => {
    return myProjects
      .filter((p: any) => ACTIVE_STATUSES.has(p.planner_status))
      .reduce((s: number, p: any) => s + (Number(p.estimated_value) || 0), 0);
  }, [myProjects]);

  const myActions = useMemo(() => {
    return (allActions || [])
      .filter((a: any) => a.consultant_id === teamMemberId)
      .slice(0, 15);
  }, [allActions, teamMemberId]);

  const totals = {
    ativos: myProjects.filter((p: any) => ACTIVE_STATUSES.has(p.planner_status)).length,
    vendidos: myProjects.filter((p: any) => p.planner_status === 'VENDIDO').length,
    perdidos: myProjects.filter((p: any) => p.planner_status === 'PERDIDO').length,
    acoesMes: (allActions || []).filter((a: any) => {
      if (a.consultant_id !== teamMemberId) return false;
      const d = a.action_date ? parseISO(a.action_date) : null;
      if (!d) return false;
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
        Painel do Consultor — {teamMemberName.split(' ')[0]}
      </h2>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<Briefcase className="h-5 w-5" />} label="Projetos ativos" value={totals.ativos} />
        <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="Vendidos" value={totals.vendidos} />
        <SummaryCard icon={<Activity className="h-5 w-5" />} label="Ações no mês" value={totals.acoesMes} />
        <SummaryCard icon={<Wallet className="h-5 w-5" />} label="Carteira flutuante" value={fmtBRL(carteiraFlutuante)} />
      </div>

      {/* Pipeline */}
      <div className="space-y-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
          Meus Projetos no Pipeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PIPELINE_COLUMNS.map(col => {
            const items = projectsByStatus[col.key] || [];
            return (
              <Card key={col.key} className="border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest">{col.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum projeto.</p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto">
                      {items.map((p: any) => {
                        const dateStr = p[col.dateField];
                        const days = dateStr ? differenceInDays(new Date(), new Date(dateStr)) : null;
                        const dangerCol = (col.key === 'CONCLUIDO' && days !== null && days >= 10)
                          || (col.key === 'AGUARDANDO_INICIO' && days !== null && days >= 15);
                        return (
                          <li key={p.id} className="text-xs border border-border rounded p-2">
                            <div className="font-medium truncate">{p.clients?.name || p.name}</div>
                            <div className="flex items-center justify-between text-muted-foreground mt-1">
                              <span className="truncate">
                                {p.focco_project_number ? `FOCCO ${p.focco_project_number}` : '—'}
                              </span>
                              {days !== null && (
                                <span className={dangerCol ? 'text-destructive font-bold' : ''}>
                                  {days}d
                                </span>
                              )}
                            </div>
                            {p.estimated_value ? (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {fmtBRL(Number(p.estimated_value))}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ações recentes */}
      <div className="space-y-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
          Últimas Ações Registradas
        </h3>
        <Card className="border-border">
          <CardContent className="p-0">
            {myActions.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Nenhuma ação registrada.</p>
            ) : (
              <ul className="divide-y divide-border">
                {myActions.map((a: any) => (
                  <li key={a.id} className="p-3 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {a.action_types?.name || 'Ação'}
                        {a.professionals?.name ? ` · ${a.professionals.name}` : ''}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {a.client_name || a.focco_project_number || '—'}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div>{a.action_date ? format(parseISO(a.action_date), 'dd/MM/yy', { locale: ptBR }) : '—'}</div>
                      {a.value ? <div className="text-muted-foreground">{fmtBRL(Number(a.value))}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indicadores do mês (já filtra para o próprio usuário se não for admin) */}
      <div className="space-y-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
          Meus Indicadores
        </h3>
        <IndicadoresTab />
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded text-muted-foreground">{icon}</div>
          <div className="min-w-0">
            <p className="text-xl font-semibold truncate">{value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}