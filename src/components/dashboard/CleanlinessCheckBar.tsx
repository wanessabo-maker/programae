import { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyWeeklyCleanlinessCheck, useSubmitCleanlinessCheck } from '@/hooks/useStoreCleanliness';
import { toast } from 'sonner';

const RATING_LABELS: Record<number, string> = {
  0: 'Muito ruim',
  1: 'Ruim',
  2: 'Regular',
  3: 'Boa',
  4: 'Ótima',
  5: 'Muito boa',
};

export function CleanlinessCheckBar() {
  const { data: existing, isLoading } = useMyWeeklyCleanlinessCheck();
  const submit = useSubmitCleanlinessCheck();
  const [hovered, setHovered] = useState<number | null>(null);

  if (isLoading) return null;

  const handleSubmit = async (rating: number) => {
    try {
      await submit.mutateAsync(rating);
      toast.success('Avaliação registrada. Obrigado!');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar avaliação');
    }
  };

  const currentRating = existing?.rating;
  const displayRating = hovered !== null ? hovered : currentRating;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-card-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Como anda a limpeza da loja hoje:
            </p>
            <p className="text-xs font-medium text-card-foreground/80">
              {existing
                ? `Você já avaliou esta semana (${RATING_LABELS[currentRating!]}). Pode atualizar se quiser.`
                : 'Selecione uma nota de 0 (muito ruim) a 5 (muito boa).'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => {
            const isSelected = currentRating === n;
            return (
              <button
                key={n}
                type="button"
                disabled={submit.isPending}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSubmit(n)}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-md border text-sm font-semibold transition-all',
                  'hover:scale-105 disabled:opacity-50',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-md'
                    : 'border-border bg-background text-foreground hover:border-primary'
                )}
                aria-label={`Nota ${n} - ${RATING_LABELS[n]}`}
              >
                {n}
                {isSelected && (
                  <Check className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                )}
              </button>
            );
          })}
          {displayRating !== undefined && displayRating !== null && (
            <span className="ml-2 min-w-[80px] text-xs font-semibold text-card-foreground">
              {RATING_LABELS[displayRating]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
