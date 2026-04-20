import { useMemo } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWeeklyCleanlinessList, getCurrentWeekStart } from '@/hooks/useStoreCleanliness';
import { useTeamMembers } from '@/hooks/useDatabase';
import { cn } from '@/lib/utils';

const ratingColor = (r: number) => {
  if (r < 2) return 'bg-destructive/15 text-destructive border-destructive/30';
  if (r < 3) return 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400';
  if (r < 4) return 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400';
  return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400';
};

const ratingLabel = (r: number) => {
  if (r < 1) return 'Muito ruim';
  if (r < 2) return 'Ruim';
  if (r < 3) return 'Regular';
  if (r < 4) return 'Boa';
  if (r < 5) return 'Ótima';
  return 'Muito boa';
};

const fmt = (n: number) => Number(n).toFixed(1).replace('.', ',');

export function CleanlinessAdminPanel() {
  const { data: checks = [], isLoading } = useWeeklyCleanlinessList();
  const { data: allMembers = [] } = useTeamMembers();

  const stats = useMemo(() => {
    const activeMembers = allMembers.filter((m: any) => m.active !== false);
    const total = checks.length;
    const avg = total ? checks.reduce((acc, c) => acc + c.rating, 0) / total : 0;
    const respondedIds = new Set(checks.map((c) => c.team_member_id));
    const pending = activeMembers.filter((m: any) => !respondedIds.has(m.id));

    // Distribuição por faixas de 1 ponto
    const buckets = [
      { label: '0–1', min: 0, max: 1, color: 'bg-destructive', text: 'text-destructive' },
      { label: '1–2', min: 1, max: 2, color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
      { label: '2–3', min: 2, max: 3, color: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
      { label: '3–4', min: 3, max: 4, color: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-400' },
      { label: '4–5', min: 4, max: 5.0001, color: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-400' },
    ].map((b) => {
      const count = checks.filter((c) => c.rating >= b.min && c.rating < b.max).length;
      const pct = total ? Math.round((count / total) * 100) : 0;
      return { ...b, count, pct };
    });

    return { total, avg, pending, totalActive: activeMembers.length, buckets };
  }, [checks, allMembers]);

  const weekLabel = format(parseISO(getCurrentWeekStart()), "'Semana de' dd 'de' MMMM", { locale: ptBR });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Limpeza da Loja — {weekLabel}
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {stats.total}/{stats.totalActive} responderam
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avg + summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Média da semana</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {stats.total ? fmt(stats.avg) : '—'}
              <span className="ml-1 text-base font-normal text-muted-foreground">/ 5</span>
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Respostas</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{stats.pending.length}</p>
          </div>
        </div>

        {/* Lista em tempo real */}
        <div>
          {stats.total > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Distribuição das notas
              </p>
              <div className="space-y-1.5">
                {stats.buckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className={cn('w-10 text-xs font-semibold tabular-nums', b.text)}>
                      {b.label}
                    </span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-muted">
                      <div
                        className={cn('h-full rounded-md transition-all', b.color)}
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs font-medium tabular-nums text-muted-foreground">
                      {b.count} ({b.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Respostas (tempo real)
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : checks.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhuma avaliação registrada esta semana ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.team_member?.name || 'Colaborador'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(c.checked_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('font-semibold', ratingColor(c.rating))}>
                      {fmt(c.rating)} • {ratingLabel(c.rating)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pendentes */}
        {stats.pending.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ainda não responderam
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stats.pending.map((m: any) => (
                <Badge key={m.id} variant="secondary" className="text-xs">
                  {m.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
