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
  if (r <= 1) return 'bg-destructive/15 text-destructive border-destructive/30';
  if (r === 2) return 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400';
  if (r === 3) return 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400';
  return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400';
};

const ratingLabel = (r: number) =>
  ({ 0: 'Muito ruim', 1: 'Ruim', 2: 'Regular', 3: 'Boa', 4: 'Ótima', 5: 'Muito boa' } as Record<number, string>)[r];

export function CleanlinessAdminPanel() {
  const { data: checks = [], isLoading } = useWeeklyCleanlinessList();
  const { data: allMembers = [] } = useTeamMembers();

  const stats = useMemo(() => {
    const activeMembers = allMembers.filter((m: any) => m.active !== false);
    const total = checks.length;
    const avg = total ? checks.reduce((acc, c) => acc + c.rating, 0) / total : 0;
    const respondedIds = new Set(checks.map((c) => c.team_member_id));
    const pending = activeMembers.filter((m: any) => !respondedIds.has(m.id));
    return { total, avg, pending, totalActive: activeMembers.length };
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
              {stats.total ? stats.avg.toFixed(1) : '—'}
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
                      {c.rating} • {ratingLabel(c.rating)}
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
