import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface ManualCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  professionalName: string;
  currentCategoryId: string;
}

export function ManualCategoryModal({
  open,
  onOpenChange,
  professionalId,
  professionalName,
  currentCategoryId,
}: ManualCategoryModalProps) {
  const { professionalCategories, updateProfessional } = useApp();

  const [form, setForm] = useState({
    categoryId: currentCategoryId,
    baseDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort categories by hierarchy
  const sortedCategories = [...professionalCategories].sort((a, b) => a.order - b.order);

  const handleSubmit = async () => {
    if (!form.categoryId || !form.baseDate) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateProfessional(professionalId, {
        categoryId: form.categoryId,
        lastActionDate: form.baseDate,
        isManualCategory: true,
      });

      toast.success('Categoria ajustada manualmente com sucesso');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Erro ao ajustar categoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = sortedCategories.find(c => c.id === form.categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground border-black max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Ajuste Manual de Categoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Profissional:</p>
            <p className="text-muted-foreground">{professionalName}</p>
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
            <p className="text-warning font-medium mb-1">⚠️ Atenção</p>
            <p className="text-muted-foreground">
              Este ajuste tem prioridade sobre a categorização automática. 
              A categoria será mantida até que a data base expire conforme as regras de cada categoria.
            </p>
          </div>

          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
              Nova Categoria *
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="input-flat w-full text-card-foreground"
            >
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.daysToChange} dias)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
              Data Base *
            </label>
            <input
              type="date"
              value={form.baseDate}
              onChange={(e) => setForm({ ...form, baseDate: e.target.value })}
              className="input-flat w-full text-card-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              A contagem de dias para mudança de categoria começará a partir desta data.
            </p>
          </div>

          {selectedCategory && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">Resumo do ajuste:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Categoria: <span className="text-foreground">{selectedCategory.name}</span></li>
                <li>• Proteção: <span className="text-foreground">{selectedCategory.daysToChange} dias</span></li>
                <li>• Data base: <span className="text-foreground">{format(new Date(form.baseDate), 'dd/MM/yyyy')}</span></li>
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onOpenChange(false)}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
