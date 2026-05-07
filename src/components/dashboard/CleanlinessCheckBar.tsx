import { useRef, useState } from 'react';
import { Sparkles, ImagePlus, X, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMyWeeklyCleanlinessCheck, useSubmitCleanlinessCheck } from '@/hooks/useStoreCleanliness';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SignedCleanlinessImage } from './SignedCleanlinessImage';

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
  const { data: member } = useCurrentTeamMember();
  const submit = useSubmitCleanlinessCheck();
  const [value, setValue] = useState<number>(2.5);
  const [notes, setNotes] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) return null;
  if (existing) return null;

  const showExtras = value < 4;
  const MAX_PHOTOS = 5;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!member?.id) {
      toast.error('Sem associação a um colaborador.');
      return;
    }
    const remaining = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, remaining);
    if (!list.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`"${file.name}" maior que 8 MB.`);
          continue;
        }
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${member.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('cleanliness-photos')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        // Store the storage path; signed URLs are generated on read
        uploaded.push(path);
      }
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar foto');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = (url: string) => {
    setPhotos((prev) => prev.filter((p) => p !== url));
  };

  const handleSubmit = async () => {
    try {
      const rounded = Math.round(value * 10) / 10;
      await submit.mutateAsync({
        rating: rounded,
        notes: notes.trim() ? notes.trim().slice(0, 500) : null,
        photos,
      });
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
            <Button onClick={handleSubmit} disabled={submit.isPending || uploading}>
              {submit.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </div>

        {showExtras && (
          <div className="space-y-3 rounded-md border border-dashed border-border bg-background/40 p-3">
            <p className="text-xs font-semibold text-card-foreground/80">
              Nota abaixo de 4 — você pode descrever o que precisa de atenção e anexar fotos (opcional).
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cleanliness-notes" className="text-xs">
                Observação (opcional)
              </Label>
              <Textarea
                id="cleanliness-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="Ex.: pó no balcão da entrada, lixo cheio no banheiro…"
                rows={3}
                maxLength={500}
                disabled={submit.isPending}
              />
              <p className="text-right text-[10px] text-muted-foreground">{notes.length}/500</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fotos (opcional, até {MAX_PHOTOS})</Label>
              <div className="flex flex-wrap gap-2">
                {photos.map((url) => (
                  <div
                    key={url}
                    className="group relative h-16 w-16 overflow-hidden rounded-md border border-border"
                  >
                    <SignedCleanlinessImage pathOrUrl={url} alt="Foto da avaliação" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remover foto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || submit.isPending}
                    className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    aria-label="Adicionar foto"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
