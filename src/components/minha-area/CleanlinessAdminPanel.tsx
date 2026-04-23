import { useMemo, useState } from 'react';
import { Sparkles, Users, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useWeeklyCleanlinessList,
  useMonthlyCleanlinessList,
  getCurrentWeekStart,
  useUpdateCleanlinessCheck,
  useDeleteCleanlinessCheck,
} from '@/hooks/useStoreCleanliness';
import { useTeamMembers } from '@/hooks/useDatabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const { data: monthChecks = [] } = useMonthlyCleanlinessList() as { data: any[] };
  const { data: allMembers = [] } = useTeamMembers();
  const { isAdmin } = useAuthContext();
  const updateCheck = useUpdateCleanlinessCheck();
  const deleteCheck = useDeleteCleanlinessCheck();

  const [editing, setEditing] = useState<{ id: string; name: string; rating: number } | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openEdit = (id: string, name: string, rating: number) => {
    setEditing({ id, name, rating });
    setEditValue(rating);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updateCheck.mutateAsync({ id: editing.id, rating: editValue });
      toast.success('Avaliação atualizada');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCheck.mutateAsync(deletingId);
      toast.success('Avaliação excluída');
      setDeletingId(null);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao excluir');
    }
  };

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

  const monthAvg = useMemo(() => {
    if (!monthChecks.length) return 0;
    return monthChecks.reduce((acc: number, c: any) => acc + Number(c.rating), 0) / monthChecks.length;
  }, [monthChecks]);

  const weekLabel = format(parseISO(getCurrentWeekStart()), "'Semana de' dd 'de' MMMM", { locale: ptBR });
  const monthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Média da semana</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {stats.total ? fmt(stats.avg) : '—'}
              <span className="ml-1 text-base font-normal text-muted-foreground">/ 5</span>
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">
              Média do mês <span className="capitalize">({monthLabel})</span>
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {monthChecks.length ? fmt(monthAvg) : '—'}
              <span className="ml-1 text-base font-normal text-muted-foreground">/ 5</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{monthChecks.length} avaliações</p>
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
            Respostas do mês <span className="capitalize text-muted-foreground/80">({monthLabel})</span>
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : monthChecks.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhuma avaliação registrada neste mês ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {monthChecks.map((c: any) => (
                <li key={c.id} className="flex flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-card-foreground">
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
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Editar avaliação"
                            onClick={() => openEdit(c.id, c.team_member?.name || 'Colaborador', c.rating)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Excluir avaliação"
                            onClick={() => setDeletingId(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {c.notes && (
                    <p className="rounded-md bg-muted/50 p-2 text-xs text-foreground/90 whitespace-pre-wrap">
                      {c.notes}
                    </p>
                  )}
                  {Array.isArray(c.photos) && c.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {c.photos.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-16 w-16 overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
                        >
                          <img src={url} alt="Foto da avaliação" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
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

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar avaliação</DialogTitle>
            <DialogDescription>
              {editing?.name} — ajuste a nota entre 0 e 5 (1 casa decimal).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Slider
              value={[editValue]}
              min={0}
              max={5}
              step={0.1}
              onValueChange={(v) => setEditValue(v[0] ?? 0)}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nota</span>
              <span className="text-2xl font-bold tabular-nums">
                {fmt(editValue)} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={updateCheck.isPending}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={updateCheck.isPending}>
              {updateCheck.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O colaborador poderá votar novamente nesta semana.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCheck.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCheck.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCheck.isPending ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
