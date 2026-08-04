import { useMemo } from 'react';
import { parseISO, isValid } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const fmtShort = (v: number) => {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
};
const fmtFull = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface Props {
  teamMemberId: string;
  year?: number;
}

export function MeusIndicadoresAnuais({ teamMemberId, year = new Date().getFullYear() }: Props) {
  const { actions, actionTypes, metas } = useApp();

  const typeById = useMemo(() => new Map(actionTypes.map(t => [t.id, t])), [actionTypes]);

  // Histórico complementar do colaborador (não vem de `actions`)
  const { data: extras } = useQuery({
    queryKey: ['meus-indicadores-extras', teamMemberId, year],
    enabled: !!teamMemberId,
    queryFn: async () => {
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;

      const [envs, steps, credits] = await Promise.all([
        supabase
          .from('project_environments')
          .select('competence_month, environment_count, projetista_id, consultant_id')
          .gte('competence_month', from)
          .lte('competence_month', to)
          .or(`projetista_id.eq.${teamMemberId},consultant_id.eq.${teamMemberId}`),
        supabase
          .from('checklist_items')
          .select('completed_at, status, assigned_to, completed_by')
          .eq('status', 'completed')
          .not('completed_at', 'is', null)
          .or(`assigned_to.eq.${teamMemberId},completed_by.eq.${teamMemberId}`),
        supabase
          .from('credit_transactions')
          .select('transaction_date, points, consultant_id')
          .eq('consultant_id', teamMemberId)
          .gte('transaction_date', from)
          .lte('transaction_date', to),
      ]);

      const ambientes = MESES.map(() => 0);
      const etapas = MESES.map(() => 0);
      const pontos = MESES.map(() => 0);

      (envs.data || []).forEach(e => {
        const d = parseISO(e.competence_month as string);
        if (isValid(d) && d.getFullYear() === year) {
          ambientes[d.getMonth()] += e.environment_count || 0;
        }
      });
      (steps.data || []).forEach(s => {
        const d = parseISO(s.completed_at as string);
        if (isValid(d) && d.getFullYear() === year) etapas[d.getMonth()] += 1;
      });
      (credits.data || []).forEach(c => {
        const d = parseISO(c.transaction_date as string);
        if (isValid(d) && d.getFullYear() === year) pontos[d.getMonth()] += c.points || 0;
      });

      return { ambientes, etapas, pontos };
    },
  });

  const ambientes = extras?.ambientes || MESES.map(() => 0);
  const etapas = extras?.etapas || MESES.map(() => 0);
  const pontos = extras?.pontos || MESES.map(() => 0);

  const data = useMemo(() => {
    const base = MESES.map(() => ({ vendido: 0, captacoes: 0, acoes: 0, especificador: 0 }));

    actions.forEach(a => {
      if (a.consultantId !== teamMemberId || !a.date) return;
      const d = parseISO(a.date);
      if (!isValid(d) || d.getFullYear() !== year) return;
      const row = base[d.getMonth()];
      const t = typeById.get(a.actionTypeId);
      row.acoes += 1;
      if (t?.classification === 'venda') row.vendido += a.value || 0;
      if (t?.impactsMetas?.includes('captacao')) row.captacoes += 1;
      if (a.professionalId) row.especificador += 1;
    });

    return base;
  }, [actions, teamMemberId, typeById, year]);

  // Metas mensais do colaborador (mês definido pela data de início da meta)
  const buildMeta = (type: string, pick: (m: any) => number = m => m.value) => {
    const result = MESES.map(() => 0);
    metas
      .filter(m => m.type === type && m.isActive && m.teamMemberId === teamMemberId)
      .forEach(m => {
        const start = (m.startDate || '').slice(0, 10);
        const [y, mo] = start.split('-').map(Number);
        if (!y || !mo || y !== year) return;
        result[mo - 1] += pick(m) || 0;
      });
    return result;
  };

  const metaVendas = useMemo(
    () => buildMeta('vendas'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metas, teamMemberId, year]
  );
  const metaCaptacao = useMemo(
    () => buildMeta('captacao'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metas, teamMemberId, year]
  );
  const metaAcoes = useMemo(
    () => buildMeta('acoes'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metas, teamMemberId, year]
  );

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const totals = {
    vendido: sum(data.map(d => d.vendido)),
    captacoes: sum(data.map(d => d.captacoes)),
    acoes: sum(data.map(d => d.acoes)),
    especificador: sum(data.map(d => d.especificador)),
    metaVendas: sum(metaVendas),
    metaCaptacao: sum(metaCaptacao),
    metaAcoes: sum(metaAcoes),
    ambientes: sum(ambientes),
    etapas: sum(etapas),
    pontos: sum(pontos),
  };

  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() : -1;
  const calcPct = (feito: number, meta: number) => (meta > 0 ? (feito / meta) * 100 : 0);
  const pctClass = (pct: number, hasMeta: boolean) => {
    if (!hasMeta) return 'text-muted-foreground';
    if (pct >= 100) return 'text-success';
    if (pct >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const cellCls = (idx: number, extra = '') =>
    `p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40 font-medium' : ''} ${extra}`;

  type Row = {
    label: string;
    values: number[];
    total: number;
    kind: 'currency' | 'count' | 'pct';
    muted?: boolean;
    metas?: number[];
    metaTotal?: number;
  };

  const rows: Row[] = [
    { label: 'Valor Vendido', values: data.map(d => d.vendido), total: totals.vendido, kind: 'currency' },
    { label: 'Meta Vendas', values: metaVendas, total: totals.metaVendas, kind: 'currency', muted: true },
    {
      label: '% da Meta',
      values: data.map((d, i) => calcPct(d.vendido, metaVendas[i])),
      total: calcPct(totals.vendido, totals.metaVendas),
      kind: 'pct',
      metas: metaVendas,
      metaTotal: totals.metaVendas,
    },
    { label: 'Captações', values: data.map(d => d.captacoes), total: totals.captacoes, kind: 'count' },
    { label: 'Meta Captações', values: metaCaptacao, total: totals.metaCaptacao, kind: 'count', muted: true },
    {
      label: '% Captações',
      values: data.map((d, i) => calcPct(d.captacoes, metaCaptacao[i])),
      total: calcPct(totals.captacoes, totals.metaCaptacao),
      kind: 'pct',
      metas: metaCaptacao,
      metaTotal: totals.metaCaptacao,
    },
    { label: 'Ações', values: data.map(d => d.acoes), total: totals.acoes, kind: 'count' },
    { label: 'Meta Ações', values: metaAcoes, total: totals.metaAcoes, kind: 'count', muted: true },
    {
      label: '% Ações',
      values: data.map((d, i) => calcPct(d.acoes, metaAcoes[i])),
      total: calcPct(totals.acoes, totals.metaAcoes),
      kind: 'pct',
      metas: metaAcoes,
      metaTotal: totals.metaAcoes,
    },
    {
      label: 'Ações c/ Especificador',
      values: data.map(d => d.especificador),
      total: totals.especificador,
      kind: 'count',
    },
    {
      label: 'Ambientes de Projeto',
      values: ambientes,
      total: totals.ambientes,
      kind: 'count',
    },
    {
      label: 'Etapas de Checklist',
      values: etapas,
      total: totals.etapas,
      kind: 'count',
    },
    {
      label: 'Pontos E+',
      values: pontos,
      total: totals.pontos,
      kind: 'count',
    },
  ];

  const renderValue = (row: Row, v: number, idx: number) => {
    if (row.kind === 'pct') {
      const hasMeta = (row.metas?.[idx] || 0) > 0;
      return hasMeta ? `${v.toFixed(0)}%` : '—';
    }
    if (row.kind === 'currency') return row.muted && v === 0 ? '—' : fmtShort(v);
    return String(v);
  };

  return (
    <section className="space-y-3">
      <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5" /> 5 · Meus Indicadores — mês a mês ({year})
      </h3>
      <div className="card-flat overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b-2 border-foreground/40">
              <th className="table-header text-left p-3 w-40">Indicador</th>
              {MESES.map((m, idx) => (
                <th
                  key={m}
                  className={`table-header text-center p-2 text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}
                >
                  {m}
                </th>
              ))}
              <th className="table-header text-center p-2 bg-foreground/10 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-b border-foreground/10 last:border-0">
                <td className="p-3 text-sm font-medium">{row.label}</td>
                {row.values.map((v, idx) => (
                  <td
                    key={idx}
                    title={row.kind === 'currency' ? fmtFull(v) : undefined}
                    className={cellCls(
                      idx,
                      row.kind === 'pct'
                        ? pctClass(v, (row.metas?.[idx] || 0) > 0)
                        : row.muted
                          ? 'text-muted-foreground'
                          : idx > currentMonth && currentMonth >= 0
                            ? 'text-muted-foreground'
                            : ''
                    )}
                  >
                    {renderValue(row, v, idx)}
                  </td>
                ))}
                <td
                  title={row.kind === 'currency' ? fmtFull(row.total) : undefined}
                  className={`p-2 text-center text-sm font-bold bg-foreground/10 ${
                    row.kind === 'pct'
                      ? pctClass(row.total, (row.metaTotal || 0) > 0)
                      : row.muted
                        ? 'text-muted-foreground'
                        : ''
                  }`}
                >
                  {row.kind === 'pct'
                    ? (row.metaTotal || 0) > 0
                      ? `${row.total.toFixed(0)}%`
                      : '—'
                    : row.kind === 'currency'
                      ? fmtShort(row.total)
                      : row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}