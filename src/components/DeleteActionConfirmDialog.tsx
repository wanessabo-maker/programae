import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';

interface RelatedCounts {
  creditTransactions: number;
  projects: number;
  clients: number;
  csCases: number;
  csActions: number;
  technicalAssistance: number;
  customerSuccess: number;
  clientInteractions: number;
}

interface DeleteActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: string | null;
  onConfirm: () => void;
}

export function DeleteActionConfirmDialog({
  open,
  onOpenChange,
  actionId,
  onConfirm,
}: DeleteActionConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<RelatedCounts | null>(null);

  useEffect(() => {
    if (open && actionId) {
      fetchRelatedCounts(actionId);
    } else {
      setCounts(null);
    }
  }, [open, actionId]);

  const fetchRelatedCounts = async (id: string) => {
    setLoading(true);
    try {
      // Get action details
      const { data: action } = await supabase
        .from('actions')
        .select('project_id, focco_project_number')
        .eq('id', id)
        .single();

      // Count credit transactions
      const { count: creditCount } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('action_id', id);

      let projectCount = 0;
      let clientCount = 0;
      let csCaseCount = 0;
      let csActionCount = 0;
      let taCount = 0;
      let csCount = 0;
      let interactionCount = 0;

      if (action?.project_id) {
        projectCount = 1;

        // Get project to find client
        const { data: project } = await supabase
          .from('projects')
          .select('client_id')
          .eq('id', action.project_id)
          .single();

        if (project?.client_id) {
          clientCount = 1;

          // Count CS cases
          const { data: csCases, count: csC } = await supabase
            .from('cs_cases')
            .select('id', { count: 'exact' })
            .eq('client_id', project.client_id);
          
          csCaseCount = csC || 0;

          if (csCases && csCases.length > 0) {
            const csCaseIds = csCases.map(c => c.id);
            const { count: csAct } = await supabase
              .from('cs_actions')
              .select('*', { count: 'exact', head: true })
              .in('cs_case_id', csCaseIds);
            csActionCount = csAct || 0;
          }

          // Count technical assistance
          const { count: ta } = await supabase
            .from('technical_assistance')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', project.client_id);
          taCount = ta || 0;

          // Count customer success
          const { count: cs } = await supabase
            .from('customer_success')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', project.client_id);
          csCount = cs || 0;

          // Count client interactions
          const { count: inter } = await supabase
            .from('client_interactions')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', project.client_id);
          interactionCount = inter || 0;
        }
      }

      setCounts({
        creditTransactions: creditCount || 0,
        projects: projectCount,
        clients: clientCount,
        csCases: csCaseCount,
        csActions: csActionCount,
        technicalAssistance: taCount,
        customerSuccess: csCount,
        clientInteractions: interactionCount,
      });
    } catch (error) {
      console.error('Error fetching related counts:', error);
      setCounts({
        creditTransactions: 0,
        projects: 0,
        clients: 0,
        csCases: 0,
        csActions: 0,
        technicalAssistance: 0,
        customerSuccess: 0,
        clientInteractions: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRelated = counts
    ? counts.creditTransactions +
      counts.projects +
      counts.clients +
      counts.csCases +
      counts.csActions +
      counts.technicalAssistance +
      counts.customerSuccess +
      counts.clientInteractions
    : 0;

  const hasRelatedRecords = totalRelated > 0;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmar Exclusão
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Tem certeza que deseja excluir esta ação?</p>
              
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Verificando registros vinculados...</span>
                </div>
              ) : hasRelatedRecords ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Os seguintes registros vinculados também serão removidos:
                  </p>
                  <ul className="text-sm space-y-1 text-foreground">
                    {counts!.creditTransactions > 0 && (
                      <li className="flex justify-between">
                        <span>Transações de Crédito (Programa E+)</span>
                        <span className="font-medium">{counts!.creditTransactions}</span>
                      </li>
                    )}
                    {counts!.projects > 0 && (
                      <li className="flex justify-between">
                        <span>Projetos</span>
                        <span className="font-medium">{counts!.projects}</span>
                      </li>
                    )}
                    {counts!.clients > 0 && (
                      <li className="flex justify-between">
                        <span>Clientes</span>
                        <span className="font-medium">{counts!.clients}</span>
                      </li>
                    )}
                    {counts!.csCases > 0 && (
                      <li className="flex justify-between">
                        <span>Casos de CS</span>
                        <span className="font-medium">{counts!.csCases}</span>
                      </li>
                    )}
                    {counts!.csActions > 0 && (
                      <li className="flex justify-between">
                        <span>Ações de CS</span>
                        <span className="font-medium">{counts!.csActions}</span>
                      </li>
                    )}
                    {counts!.technicalAssistance > 0 && (
                      <li className="flex justify-between">
                        <span>Assistência Técnica</span>
                        <span className="font-medium">{counts!.technicalAssistance}</span>
                      </li>
                    )}
                    {counts!.customerSuccess > 0 && (
                      <li className="flex justify-between">
                        <span>Customer Success</span>
                        <span className="font-medium">{counts!.customerSuccess}</span>
                      </li>
                    )}
                    {counts!.clientInteractions > 0 && (
                      <li className="flex justify-between">
                        <span>Interações do Cliente</span>
                        <span className="font-medium">{counts!.clientInteractions}</span>
                      </li>
                    )}
                  </ul>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-destructive/20">
                    Total de registros a serem removidos: <strong>{totalRelated}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro vinculado será afetado.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Aguarde...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
