import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Database } from '@/integrations/supabase/types';

type FunctionalArea = Database['public']['Enums']['functional_area'];

interface UserAreasModalProps {
  user: {
    id: string;
    email: string;
    areas: FunctionalArea[];
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

// All configurable areas with labels
const CONFIGURABLE_AREAS: { value: FunctionalArea; label: string }[] = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'projetos', label: 'Projetos' },
  { value: 'customer_success', label: 'Customer Success & AT' },
  { value: 'assistencia_tecnica', label: 'Assistência Técnica' },
];

export function UserAreasModal({ user, onClose, onSuccess }: UserAreasModalProps) {
  const [selectedAreas, setSelectedAreas] = useState<FunctionalArea[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize selected areas when user changes
  useEffect(() => {
    if (user) {
      setSelectedAreas(user.areas || []);
    }
  }, [user]);

  const handleToggleArea = (area: FunctionalArea) => {
    setSelectedAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setIsProcessing(true);

    try {
      const currentAreas = user.areas || [];
      
      // Determine areas to add and remove
      const areasToAdd = selectedAreas.filter(a => !currentAreas.includes(a));
      const areasToRemove = currentAreas.filter(a => !selectedAreas.includes(a));

      // Remove areas
      if (areasToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_areas')
          .delete()
          .eq('user_id', user.id)
          .in('area', areasToRemove);

        if (removeError) throw removeError;
      }

      // Add areas
      if (areasToAdd.length > 0) {
        const insertData = areasToAdd.map(area => ({
          user_id: user.id,
          area,
        }));

        const { error: insertError } = await supabase
          .from('user_areas')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      toast.success('Áreas atualizadas com sucesso');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating user areas:', error);
      toast.error('Erro ao atualizar áreas');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasChanges = () => {
    if (!user) return false;
    const currentAreas = user.areas || [];
    if (currentAreas.length !== selectedAreas.length) return true;
    return !currentAreas.every(a => selectedAreas.includes(a));
  };

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base tracking-widest uppercase flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Gerenciar Áreas
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Usuário: <strong className="text-foreground">{user?.email}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">
              Selecione as áreas que o usuário pode acessar:
            </p>
            
            <div className="space-y-3">
              {CONFIGURABLE_AREAS.map((area) => (
                <div key={area.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`area-${area.value}`}
                    checked={selectedAreas.includes(area.value)}
                    onCheckedChange={() => handleToggleArea(area.value)}
                    disabled={isProcessing}
                  />
                  <Label 
                    htmlFor={`area-${area.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {area.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground mt-4 space-y-1 border-t border-border pt-4">
            <p>• <strong>Dashboard</strong> e <strong>Programa E+</strong> são acessíveis a todos os usuários</p>
            <p>• Administradores têm acesso a todas as áreas automaticamente</p>
            <p>• Alterações têm efeito imediato</p>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs tracking-widest uppercase border border-border hover:bg-muted transition-colors"
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing || !hasChanges()}
            className="px-4 py-2 text-xs tracking-widest uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Salvar'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
