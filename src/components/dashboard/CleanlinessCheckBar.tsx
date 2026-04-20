import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useMyWeeklyCleanlinessCheck, useSubmitCleanlinessCheck } from '@/hooks/useStoreCleanliness';
import { toast } from 'sonner';

const labelFor = (n: number) => {
  if (n < 1) return 'Muito ruim';
  if (n < 2) return 'Ruim';
  if (n < 3) return 'Regular';
  if (n < 4) return 'Boa';
  if (n < 5) return 'Ótima';
  return 'Muito boa';
};

export function CleanlinessCheckBar() {
  const { data: existing, isLoading } = useMyWeeklyCleanlinessCheck();
  const submit = useSubmitCleanlinessCheck();
  const [value, setValue] = useState<number>(2.5);

  if (isLoading) return null;
  if (existing) return null;

  const handleSubmit = async () => {
    try {
      // arredonda para 1 casa decimal
      const rounded = Math.round(value * 10) / 10;
      await submit.mutateAsync(rounded);
      toast.success('Avaliação registrada. Obrigado!');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar avaliação');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-card-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-card-foreground">
              Como anda a limpeza da loja hoje:
            </p>
            <p className="text-xs font-medium text-card-foreground/80">
              Arraste o controle entre 0 (muito ruim) e 5 (muito boa). Aceita 1 casa decimal.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex-1">
            <Slider
              value={[value]}
              min={0}
              max={5}
              step={0.1}
              onValueChange={(v) => setValue(v[0] ?? 0)}
              disabled={submit.isPending}
            />
            <div className="mt-1 flex justify-between text-[10px] font-medium text-card-foreground/60">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-2xl font-bold tabular-nums text-card-foreground">
                {value.toFixed(1).replace('.', ',')}
              </span>
              <span className="text-xs font-semibold text-card-foreground/80">
                {labelFor(value)}
              </span>
            </div>
            <Button onClick={handleSubmit} disabled={submit.isPending}>
              {submit.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
