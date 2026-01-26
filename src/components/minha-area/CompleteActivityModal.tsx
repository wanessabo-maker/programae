import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  FileText, 
  User, 
  Building2,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { 
  useCompleteChecklistItem, 
  getResponsibleAreaLabel,
  getWorkflowStatusLabel,
  ChecklistItemWithDetails 
} from '@/hooks/useChecklist';

interface CompleteActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ChecklistItemWithDetails | null;
  onClose: () => void;
}

export function CompleteActivityModal({ 
  open, 
  onOpenChange, 
  item,
  onClose 
}: CompleteActivityModalProps) {
  const [notes, setNotes] = useState('');
  const { data: currentTeamMember } = useCurrentTeamMember();
  const completeItem = useCompleteChecklistItem();

  const handleComplete = async () => {
    if (!item || !currentTeamMember?.id) return;

    await completeItem.mutateAsync({
      itemId: item.id,
      notes: notes || undefined,
      completedBy: currentTeamMember.id,
    });

    setNotes('');
    onClose();
  };

  const handleCancel = () => {
    setNotes('');
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Registrar Ação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Activity Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div>
              <h3 className="font-medium text-lg">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Etapa {item.step_order}/18
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {getResponsibleAreaLabel(item.responsible_area)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Contract Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {item.project?.clients?.name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{item.project.clients.name}</span>
                </div>
              )}
              {item.project?.focco_project_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>FOCCO {item.project.focco_project_number}</span>
                </div>
              )}
              {item.project?.name && (
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <Building2 className="h-4 w-4" />
                  <span>{item.project.name}</span>
                </div>
              )}
              {item.due_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Prazo: {format(parseISO(item.due_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {item.checklist?.workflow_status && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Status do Contrato: </span>
                  <span className="font-medium">
                    {getWorkflowStatusLabel(item.checklist.workflow_status)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre a conclusão desta atividade..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Info about next step */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-blue-700 dark:text-blue-300">
              Ao confirmar, esta etapa será marcada como concluída e a próxima etapa 
              será automaticamente ativada para o responsável correspondente.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={completeItem.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={completeItem.isPending}
            className="gap-2"
          >
            {completeItem.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Conclusão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
