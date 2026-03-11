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
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RelatedCounts {
  checklistItems: number;
  checklistHistory: number;
  checklistAttachments: number;
  creditTransactions: number;
  csCases: number;
  csActions: number;
  technicalAssistance: number;
  customerSuccess: number;
  clientInteractions: number;
  projectValueHistory: number;
  projectEnvironments: number;
  linkedActions: number;
  hasClient: boolean;
}

interface DeleteContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string;
}

export function DeleteContractDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: DeleteContractDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [counts, setCounts] = useState<RelatedCounts | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && projectId) {
      fetchRelatedCounts(projectId);
    } else {
      setCounts(null);
    }
  }, [open, projectId]);

  const fetchRelatedCounts = async (id: string) => {
    setLoading(true);
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('client_id')
        .eq('id', id)
        .single();

      // Checklist
      const { data: checklists } = await supabase
        .from('contract_checklists')
        .select('id')
        .eq('project_id', id);

      let checklistItemCount = 0;
      let historyCount = 0;
      let attachmentCount = 0;
      const checklistIds = checklists?.map(c => c.id) || [];

      if (checklistIds.length > 0) {
        const { data: items } = await supabase
          .from('checklist_items')
          .select('id')
          .in('checklist_id', checklistIds);
        checklistItemCount = items?.length || 0;

        const itemIds = items?.map(i => i.id) || [];
        if (itemIds.length > 0) {
          const { count: hc } = await supabase
            .from('checklist_history')
            .select('*', { count: 'exact', head: true })
            .in('checklist_item_id', itemIds);
          historyCount = hc || 0;

          const { count: ac } = await supabase
            .from('checklist_attachments')
            .select('*', { count: 'exact', head: true })
            .in('checklist_item_id', itemIds);
          attachmentCount = ac || 0;
        }
      }

      // Credit transactions from linked actions
      const { data: linkedActions } = await supabase
        .from('actions')
        .select('id')
        .eq('project_id', id);
      const actionIds = linkedActions?.map(a => a.id) || [];

      let creditCount = 0;
      if (actionIds.length > 0) {
        const { count: cc } = await supabase
          .from('credit_transactions')
          .select('*', { count: 'exact', head: true })
          .in('action_id', actionIds);
        creditCount = cc || 0;
      }

      // CS, AT, etc.
      const { count: csCaseCount } = await supabase
        .from('cs_cases')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id);

      let csActionCount = 0;
      if ((csCaseCount || 0) > 0) {
        const { data: cases } = await supabase.from('cs_cases').select('id').eq('project_id', id);
        if (cases && cases.length > 0) {
          const { count: ca } = await supabase
            .from('cs_actions')
            .select('*', { count: 'exact', head: true })
            .in('cs_case_id', cases.map(c => c.id));
          csActionCount = ca || 0;
        }
      }

      const { count: taCount } = await supabase
        .from('technical_assistance')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id);

      const { count: csCount } = await supabase
        .from('customer_success')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id);

      const { count: pvhCount } = await supabase
        .from('project_value_history')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id);

      const { count: peCount } = await supabase
        .from('project_environments')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id);

      let interactionCount = 0;
      if (project?.client_id) {
        const { count: ic } = await supabase
          .from('client_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', project.client_id);
        interactionCount = ic || 0;
      }

      setCounts({
        checklistItems: checklistItemCount,
        checklistHistory: historyCount,
        checklistAttachments: attachmentCount,
        creditTransactions: creditCount,
        csCases: csCaseCount || 0,
        csActions: csActionCount,
        technicalAssistance: taCount || 0,
        customerSuccess: csCount || 0,
        projectValueHistory: pvhCount || 0,
        projectEnvironments: peCount || 0,
        linkedActions: actionIds.length,
        clientInteractions: interactionCount,
        hasClient: !!project?.client_id,
      });
    } catch (error) {
      console.error('Error fetching related counts:', error);
      setCounts(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    setDeleting(true);
    try {
      // 1. Get project info
      const { data: project } = await supabase
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .single();

      // 2. Get checklist IDs
      const { data: checklists } = await supabase
        .from('contract_checklists')
        .select('id')
        .eq('project_id', projectId);
      const checklistIds = checklists?.map(c => c.id) || [];

      // 3. Delete checklist chain
      if (checklistIds.length > 0) {
        const { data: items } = await supabase
          .from('checklist_items')
          .select('id')
          .in('checklist_id', checklistIds);
        const itemIds = items?.map(i => i.id) || [];

        if (itemIds.length > 0) {
          await supabase.from('checklist_history').delete().in('checklist_item_id', itemIds);
          await supabase.from('checklist_attachments').delete().in('checklist_item_id', itemIds);
        }
        await supabase.from('checklist_items').delete().in('checklist_id', checklistIds);
        await supabase.from('contract_checklists').delete().eq('project_id', projectId);
      }

      // 4. Delete project_value_history & project_environments
      await supabase.from('project_value_history').delete().eq('project_id', projectId);
      await supabase.from('project_environments').delete().eq('project_id', projectId);

      // 5. Delete CS actions → CS cases
      const { data: csCases } = await supabase.from('cs_cases').select('id').eq('project_id', projectId);
      if (csCases && csCases.length > 0) {
        await supabase.from('cs_actions').delete().in('cs_case_id', csCases.map(c => c.id));
        await supabase.from('cs_cases').delete().eq('project_id', projectId);
      }

      // 6. Delete technical assistance & customer success linked to project
      await supabase.from('technical_assistance').delete().eq('project_id', projectId);
      await supabase.from('customer_success').delete().eq('project_id', projectId);

      // 7. Unlink actions from project (don't delete the actions themselves)
      await supabase.from('actions').update({ project_id: null }).eq('project_id', projectId);

      // 8. Delete client and related if exists
      if (project?.client_id) {
        await supabase.from('client_interactions').delete().eq('client_id', project.client_id);
        await supabase.from('customer_success').delete().eq('client_id', project.client_id);
        await supabase.from('technical_assistance').delete().eq('client_id', project.client_id).is('project_id', null);
        // Unlink client from other projects
        await supabase.from('projects').update({ client_id: null }).eq('client_id', project.client_id).neq('id', projectId);
        await supabase.from('clients').delete().eq('id', project.client_id);
      }

      // 9. Delete the project
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;

      // 10. Invalidate caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        queryClient.invalidateQueries({ queryKey: ['actions'] }),
        queryClient.invalidateQueries({ queryKey: ['credit_transactions'] }),
      ]);

      toast.success('Contrato excluído com sucesso');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      toast.error('Erro ao excluir contrato: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setDeleting(false);
    }
  };

  const totalRelated = counts
    ? counts.checklistItems + counts.checklistHistory + counts.checklistAttachments +
      counts.creditTransactions + counts.csCases + counts.csActions +
      counts.technicalAssistance + counts.customerSuccess +
      counts.projectValueHistory + counts.projectEnvironments +
      counts.clientInteractions + (counts.hasClient ? 1 : 0)
    : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Contrato
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Tem certeza que deseja excluir o contrato <strong>{projectName}</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                As ações vinculadas serão desvinculadas, mas não excluídas.
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Verificando registros vinculados...</span>
                </div>
              ) : totalRelated > 0 ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Os seguintes registros vinculados serão removidos:
                  </p>
                  <ul className="text-sm space-y-1 text-foreground">
                    {counts!.hasClient && (
                      <li className="flex justify-between"><span>Cliente</span><span className="font-medium">1</span></li>
                    )}
                    {counts!.checklistItems > 0 && (
                      <li className="flex justify-between"><span>Etapas do Checklist</span><span className="font-medium">{counts!.checklistItems}</span></li>
                    )}
                    {counts!.checklistHistory > 0 && (
                      <li className="flex justify-between"><span>Histórico do Checklist</span><span className="font-medium">{counts!.checklistHistory}</span></li>
                    )}
                    {counts!.checklistAttachments > 0 && (
                      <li className="flex justify-between"><span>Anexos do Checklist</span><span className="font-medium">{counts!.checklistAttachments}</span></li>
                    )}
                    {counts!.creditTransactions > 0 && (
                      <li className="flex justify-between"><span>Transações de Crédito</span><span className="font-medium">{counts!.creditTransactions}</span></li>
                    )}
                    {counts!.csCases > 0 && (
                      <li className="flex justify-between"><span>Casos de CS</span><span className="font-medium">{counts!.csCases}</span></li>
                    )}
                    {counts!.csActions > 0 && (
                      <li className="flex justify-between"><span>Ações de CS</span><span className="font-medium">{counts!.csActions}</span></li>
                    )}
                    {counts!.technicalAssistance > 0 && (
                      <li className="flex justify-between"><span>Assistência Técnica</span><span className="font-medium">{counts!.technicalAssistance}</span></li>
                    )}
                    {counts!.customerSuccess > 0 && (
                      <li className="flex justify-between"><span>Customer Success</span><span className="font-medium">{counts!.customerSuccess}</span></li>
                    )}
                    {counts!.projectValueHistory > 0 && (
                      <li className="flex justify-between"><span>Histórico de Valores</span><span className="font-medium">{counts!.projectValueHistory}</span></li>
                    )}
                    {counts!.projectEnvironments > 0 && (
                      <li className="flex justify-between"><span>Ambientes</span><span className="font-medium">{counts!.projectEnvironments}</span></li>
                    )}
                    {counts!.clientInteractions > 0 && (
                      <li className="flex justify-between"><span>Interações do Cliente</span><span className="font-medium">{counts!.clientInteractions}</span></li>
                    )}
                  </ul>
                  {counts!.linkedActions > 0 && (
                    <p className="text-xs text-muted-foreground pt-2 border-t border-destructive/20">
                      {counts!.linkedActions} ação(ões) será(ão) desvinculada(s) do projeto.
                    </p>
                  )}
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
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              'Excluir Contrato'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
