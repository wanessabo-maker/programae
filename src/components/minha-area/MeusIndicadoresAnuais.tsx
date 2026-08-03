import { useMemo } from 'react';
import { parseISO, isValid } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSetup } from '@/contexts/SetupContext';
import { useActions } from '@/hooks/useDatabase';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

interface Props {
  teamMemberId: string;
  year?: number;
}

export function MeusIndicadoresAnuais({ teamMemberId, year = new Date().getFullYear() }: Props) {
  const { actionTypes } = useSetup();
  const { data: allActions = [] } = useActions();

  const typeById = useMemo(() => new Map(actionTypes.map(t => [t.id, t])), [actionTypes]);

  const rows = useMemo(() => {
    const base = MESES.map((label, i) => ({ label, month: i, vendido: 0, captacoes: 0, acoes: 0 }));

    (allActions || []).forEach((a: any) => {
      if (a.consultant_id !== teamMemberId || !a.action_date) return;
      const d = parseISO(a.action_date);
      if (!isValid(d) || d.getFullYear() !== year) return;
      const row = base[d.getMonth()];
      const t = typeById.get(a.action_type_id);
      row.acoes += 1;
      if (t?.classification === 'venda') row.vendido += Number(a.value) || 0;
      if (t?.impactsMetas?.includes('captacao')) row.captacoes += 1;
    });

    return base;
  }, [allActions, teamMemberId, typeById, year]);

  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() : -1;

  const total = rows.reduce(
    (acc, r) => ({ vendido: acc.vendido + r.vendido, captacoes: acc.captacoes + r.captacoes, acoes: acc.acoes + r.acoes }),
    { vendido: 0, captacoes: 0, acoes: 0 }
  );

  return (
    <section className="space-y-3">
      <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5" /> 5 · Meus Indicadores — mês a mês ({year})
      </h3>
      <Card className="border-border max-w-3xl">
        <CardContent className="p-0">
          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[32%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Mês</th>
                <th className="text-right px-4 py-2.5 font-medium">Vendido</th>
                <th className="text-right px-4 py-2.5 font-medium">Captações</th>
                <th className="text-right px-4 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const empty = r.vendido === 0 && r.captacoes === 0 && r.acoes === 0;
                const isCurrent = r.month === currentMonth;
                return (
                  <tr
                    key={r.label}
                    className={`border-b border-border/60 last:border-0 ${isCurrent ? 'bg-muted/30' : ''} ${empty ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-2 uppercase tracking-widest text-[10px] text-muted-foreground">
                      {r.label}
                      {isCurrent && <span className="ml-2 text-[9px] text-foreground/70">atual</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{r.vendido > 0 ? fmtBRL(r.vendido) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.captacoes || '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.acoes || '—'}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <td className="px-4 py-2.5 uppercase tracking-widest text-[10px]">Total {year}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtBRL(total.vendido)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{total.captacoes}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{total.acoes}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}