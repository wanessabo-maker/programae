import { useState, useEffect, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePositions } from '@/hooks/usePositions';
import { useApp } from '@/contexts/AppContext';
import { Loader2 } from 'lucide-react';

interface ReassignChecklistProfessionalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistId: string;
  currentProjetistaId: string | null;
  currentLogisticaId: string | null;
  currentCsId: string | null;
  currentApresentacaoProjetistaId?: string | null;
}

export function ReassignChecklistProfessionalsModal({
  open,
  onOpenChange,
  checklistId,
  currentProjetistaId,
  currentLogisticaId,
  currentCsId,
  currentApresentacaoProjetistaId,
}: ReassignChecklistProfessionalsModalProps) {
  const queryClient = useQueryClient();
  const { positions, memberPositions } = usePositions();
  const { teamMembers } = useApp();

  const [projetistaId, setProjetistaId] = useState<string | null>(currentProjetistaId);
  const [logisticaId, setLogisticaId] = useState<string | null>(currentLogisticaId);
  const [csId, setCsId] = useState<string | null>(currentCsId);
  const [apresentacaoProjetistaId, setApresentacaoProjetistaId] = useState<string | null>(currentApresentacaoProjetistaId || null);

  // Reset state when modal opens with new values
  useEffect(() => {
    if (open) {
      setProjetistaId(currentProjetistaId);
      setLogisticaId(currentLogisticaId);
      setCsId(currentCsId);
      setApresentacaoProjetistaId(currentApresentacaoProjetistaId || null);
    }
  }, [open, currentProjetistaId, currentLogisticaId, currentCsId, currentApresentacaoProjetistaId]);

  // Get projetistas (members with Projetista Técnico position)
  const projetistas = useMemo(() => {
    const projetistaPositionIds = positions
      .filter(p => p.name.toLowerCase().includes('projetista'))
      .map(p => p.id);
    
    const memberIds = memberPositions
      .filter(tmp => projetistaPositionIds.includes(tmp.position_id))
      .map(tmp => tmp.team_member_id);
    
    const uniqueMemberIds = [...new Set(memberIds)];
    return teamMembers.filter(m => uniqueMemberIds.includes(m.id) && m.active);
  }, [positions, memberPositions, teamMembers]);

  // Get logistica members (members with Analista de Logística position)
  const logisticaMembers = useMemo(() => {
    const logisticaPositionIds = positions
      .filter(p => 
        p.name.toLowerCase().includes('logística') || 
        p.name.toLowerCase().includes('logistica')
      )
      .map(p => p.id);
    
    const memberIds = memberPositions
      .filter(tmp => logisticaPositionIds.includes(tmp.position_id))
      .map(tmp => tmp.team_member_id);
    
    const uniqueMemberIds = [...new Set(memberIds)];
    return teamMembers.filter(m => uniqueMemberIds.includes(m.id) && m.active);
  }, [positions, memberPositions, teamMembers]);

  // Get CS members (members with CS/Customer Success position)
  const csMembers = useMemo(() => {
    const csPositionIds = positions
      .filter(p => 
        p.name.toLowerCase().includes('cs') || 
        p.name.toLowerCase().includes('customer success') ||
        p.area === 'customer_success'
      )
      .map(p => p.id);
    
    const memberIds = memberPositions
      .filter(tmp => csPositionIds.includes(tmp.position_id))
      .map(tmp => tmp.team_member_id);
    
    const uniqueMemberIds = [...new Set(memberIds)];
    return teamMembers.filter(m => uniqueMemberIds.includes(m.id) && m.active);
  }, [positions, memberPositions, teamMembers]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Update the contract_checklists table
      const { error: checklistError } = await supabase
        .from('contract_checklists')
        .update({
          assigned_projetista_id: projetistaId,
          assigned_logistica_id: logisticaId,
          assigned_cs_id: csId,
        })
        .eq('id', checklistId);

      if (checklistError) throw checklistError;

      // Update checklist_items for projetista_tecnico area
      if (projetistaId !== currentProjetistaId) {
        const { error: projetistaItemsError } = await supabase
          .from('checklist_items')
          .update({ assigned_to: projetistaId })
          .eq('checklist_id', checklistId)
          .eq('responsible_area', 'projetista_tecnico');

        if (projetistaItemsError) throw projetistaItemsError;
      }

      // Update checklist_items for logistica area
      if (logisticaId !== currentLogisticaId) {
        const { error: logisticaItemsError } = await supabase
          .from('checklist_items')
          .update({ assigned_to: logisticaId })
          .eq('checklist_id', checklistId)
          .eq('responsible_area', 'logistica');

        if (logisticaItemsError) throw logisticaItemsError;
      }

      // Update checklist_items for cs area
      if (csId !== currentCsId) {
        const { error: csItemsError } = await supabase
          .from('checklist_items')
          .update({ assigned_to: csId })
          .eq('checklist_id', checklistId)
          .eq('responsible_area', 'cs');

        if (csItemsError) throw csItemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['my-all-checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-checklist-items'] });
      toast.success('Responsáveis atualizados com sucesso!');
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error updating checklist professionals:', error);
      toast.error('Erro ao atualizar responsáveis');
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  const hasChanges = projetistaId !== currentProjetistaId || logisticaId !== currentLogisticaId || csId !== currentCsId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reatribuir Responsáveis</DialogTitle>
          <DialogDescription>
            Selecione os profissionais responsáveis pelas etapas técnicas e logísticas deste contrato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Projetista Técnico */}
          <div className="space-y-2">
            <Label htmlFor="projetista">Projetista Técnico</Label>
            <Select
              value={projetistaId || 'none'}
              onValueChange={(value) => setProjetistaId(value === 'none' ? null : value)}
            >
              <SelectTrigger id="projetista">
                <SelectValue placeholder="Selecione um projetista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Nenhum (visível para toda a área)</span>
                </SelectItem>
                {projetistas.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projetistas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum membro com cargo de Projetista Técnico encontrado.
              </p>
            )}
          </div>

          {/* Analista de Logística */}
          <div className="space-y-2">
            <Label htmlFor="logistica">Analista de Logística</Label>
            <Select
              value={logisticaId || 'none'}
              onValueChange={(value) => setLogisticaId(value === 'none' ? null : value)}
            >
              <SelectTrigger id="logistica">
                <SelectValue placeholder="Selecione um analista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Nenhum (visível para toda a área)</span>
                </SelectItem>
                {logisticaMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {logisticaMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum membro com cargo de Analista de Logística encontrado.
              </p>
            )}
          </div>

          {/* Analista de CS */}
          <div className="space-y-2">
            <Label htmlFor="cs">Analista de CS</Label>
            <Select
              value={csId || 'none'}
              onValueChange={(value) => setCsId(value === 'none' ? null : value)}
            >
              <SelectTrigger id="cs">
                <SelectValue placeholder="Selecione um analista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Nenhum (visível para toda a área)</span>
                </SelectItem>
                {csMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {csMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum membro com cargo de Analista de CS encontrado.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
