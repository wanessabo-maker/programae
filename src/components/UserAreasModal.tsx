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

interface Area {
  id: string;
  name: string;
}

interface UserAreasModalProps {
  user: {
    id: string;
    email: string;
    areaIds: string[];
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserAreasModal({ user, onClose, onSuccess }: UserAreasModalProps) {
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);

  // Fetch areas from database
  useEffect(() => {
    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      try {
        const { data, error } = await supabase
          .from('areas')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;
        setAreas(data || []);
      } catch (error) {
        console.error('Error fetching areas:', error);
        toast.error('Erro ao carregar áreas');
      } finally {
        setIsLoadingAreas(false);
      }
    };

    fetchAreas();
  }, []);

  // Initialize selected areas when user changes
  useEffect(() => {
    if (user) {
      setSelectedAreaIds(user.areaIds || []);
    }
  }, [user]);

  const handleToggleArea = (areaId: string) => {
    setSelectedAreaIds(prev => 
      prev.includes(areaId) 
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setIsProcessing(true);

    try {
      const currentAreaIds = user.areaIds || [];
      
      // Determine areas to add and remove
      const areasToAdd = selectedAreaIds.filter(id => !currentAreaIds.includes(id));
      const areasToRemove = currentAreaIds.filter(id => !selectedAreaIds.includes(id));

      // Remove areas
      if (areasToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_area_assignments')
          .delete()
          .eq('user_id', user.id)
          .in('area_id', areasToRemove);

        if (removeError) throw removeError;
      }

      // Add areas
      if (areasToAdd.length > 0) {
        const insertData = areasToAdd.map(areaId => ({
          user_id: user.id,
          area_id: areaId,
        }));

        const { error: insertError } = await supabase
          .from('user_area_assignments')
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
    const currentAreaIds = user.areaIds || [];
    if (currentAreaIds.length !== selectedAreaIds.length) return true;
    return !currentAreaIds.every(id => selectedAreaIds.includes(id));
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
            
            {isLoadingAreas ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`area-${area.id}`}
                      checked={selectedAreaIds.includes(area.id)}
                      onCheckedChange={() => handleToggleArea(area.id)}
                      disabled={isProcessing}
                    />
                    <Label 
                      htmlFor={`area-${area.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {area.name}
                    </Label>
                  </div>
                ))}
                {areas.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma área cadastrada. Adicione áreas em Setup.
                  </p>
                )}
              </div>
            )}
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
