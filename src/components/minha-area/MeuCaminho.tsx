import { useMemo, useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ListChecks } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useActions } from '@/hooks/useDatabase';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const parsed = parseISO(d);
  return isValid(parsed) ? format(parsed, 'dd/MM/yy', { locale: ptBR }) : '—';
};

interface Props {
  teamMemberId: string;
}

export function MeuCaminho({ teamMemberId }: Props) {
  const { data: allActions = [] } = useActions();

  const myActions = useMemo(
    () =>
      (allActions || [])
        .filter((a: any) => a.consultant_id === teamMemberId)
        .sort((a: any, b: any) => (b.action_date || '').localeCompare(a.action_date || ''))
        .slice(0, 20),
    [allActions, teamMemberId]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5" /> 2 · Minhas Ações
        </h3>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Minhas ações registradas
            </p>
            <Badge variant="secondary" className="text-[10px]">{myActions.length}</Badge>
          </div>
          {myActions.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">
              Nenhuma ação registrada ainda. Cada ação registrada alimenta automaticamente o realizado das suas metas.
            </p>
          ) : (
            <ul className="divide-y divide-border max-h-80 overflow-y-auto">
              {myActions.map((a: any) => (
                <li key={a.id} className="p-3 text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {a.action_types?.name || 'Ação'}
                      {a.professionals?.name ? ` · ${a.professionals.name}` : ''}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {a.client_name || (a.focco_project_number ? `FOCCO ${a.focco_project_number}` : '—')}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div>{fmtDate(a.action_date)}</div>
                    {a.value ? <div className="text-muted-foreground">{fmtBRL(Number(a.value))}</div> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

    </section>
  );
}