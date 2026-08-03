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

  const total = rows.reduce(
    (acc, r) => ({ vendido: acc.vendido + r.vendido, captacoes: acc.captacoes + r.captacoes, acoes: acc.acoes + r.acoes }),
    { vendido: 0, captacoes: 0, acoes: 0 }
  );

  return (
    <section className="space-y-3">
      <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5" /> 5 · Meus Indicadores — mês a mês ({year})
      </h3>
      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left p-3 font-medium">Mês</th>
                <th className="text-right p-3 font-medium">Vendido</th>
                <th className="text-right p-3 font-medium">Captações</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <td className="p-3 uppercase tracking-widest text-[10px] text-muted-foreground">{r.label}</td>
                  <td className="p-3 text-right font-medium">{r.vendido > 0 ? fmtBRL(r.vendido) : '—'}</td>
                  <td className="p-3 text-right">{r.captacoes || '—'}</td>
                  <td className="p-3 text-right">{r.acoes || '—'}</td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <td className="p-3 uppercase tracking-widest text-[10px]">Total {year}</td>
                <td className="p-3 text-right">{fmtBRL(total.vendido)}</td>
                <td className="p-3 text-right">{total.captacoes}</td>
                <td className="p-3 text-right">{total.acoes}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}