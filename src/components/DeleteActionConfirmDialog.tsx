import { useEffect } from 'react';
import { Loader2, AlertTriangle, Trash2, FileText, Users, FolderKanban, Headphones, Award } from 'lucide-react';
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
import { useActionRelatedCounts } from '@/hooks/useActionRelatedCounts';

interface DeleteActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: string;
  projectId?: string | null;
  foccoProjectNumber?: string | null;
  actionTypeName?: string;
  professionalName?: string;
  onConfirm: () => void;
}

export function DeleteActionConfirmDialog({
  open,
  onOpenChange,
  actionId,
  projectId,
  foccoProjectNumber,
  actionTypeName,
  professionalName,
  onConfirm,
}: DeleteActionConfirmDialogProps) {
  const { counts, isLoading, fetchCounts, reset } = useActionRelatedCounts();

  useEffect(() => {
    if (open && actionId) {
      fetchCounts(actionId, projectId, foccoProjectNumber);
    } else {
      reset();
    }
  }, [open, actionId, projectId, foccoProjectNumber, fetchCounts, reset]);

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const hasRelatedRecords = counts && counts.total > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Ação
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Action Info */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium text-foreground">{actionTypeName || 'Ação'}</p>
                {professionalName && (
                  <p className="text-muted-foreground">Especificador: {professionalName}</p>
                )}
                {foccoProjectNumber && (
                  <p className="text-muted-foreground">FOCCO: {foccoProjectNumber}</p>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Analisando registros vinculados...</span>
                </div>
              ) : hasRelatedRecords ? (
                <>
                  <div className="text-sm text-destructive font-medium">
                    ⚠️ Os seguintes registros serão excluídos permanentemente:
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {counts.project && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                        <FolderKanban className="h-4 w-4 text-destructive" />
                        <span>1 Projeto</span>
                      </div>
                    )}
                    
                    {counts.client && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                        <Users className="h-4 w-4 text-destructive" />
                        <span>1 Cliente</span>
                      </div>
                    )}
                    
                    {counts.creditTransactions > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                        <Award className="h-4 w-4 text-destructive" />
                        <span>{counts.creditTransactions} Crédito{counts.creditTransactions > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    
                    {counts.csCases > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                        <FileText className="h-4 w-4 text-destructive" />
                        <span>{counts.csCases} Caso{counts.csCases > 1 ? 's' : ''} CS</span>
                      </div>
                    )}
                    
                    {counts.csActions > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                        <FileText className="h-4 w-4 text-destructive" />
                        <span>{counts.csActions} Ação{counts.csActions > 1 ? 'ões' : ''} CS</span>
                      </div>
                    )}
                    
                    {counts.technicalAssistance > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                        <Headphones className="h-4 w-4 text-destructive" />
                        <span>{counts.technicalAssistance} AT</span>
                      </div>
                    )}
                    
                    {counts.clientInteractions > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                        <Users className="h-4 w-4 text-destructive" />
                        <span>{counts.clientInteractions} Interação{counts.clientInteractions > 1 ? 'ões' : ''}</span>
                      </div>
                    )}
                    
                    {counts.customerSuccess > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                        <FileText className="h-4 w-4 text-destructive" />
                        <span>{counts.customerSuccess} Reg. CS</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
                    <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os {counts.total} registros vinculados serão removidos permanentemente.
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro vinculado será afetado. Deseja continuar com a exclusão?
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir {hasRelatedRecords ? `(${counts.total + 1} itens)` : 'Ação'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
