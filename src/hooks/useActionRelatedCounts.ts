import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActionRelatedCounts {
  creditTransactions: number;
  project: boolean;
  client: boolean;
  csActions: number;
  csCases: number;
  technicalAssistance: number;
  clientInteractions: number;
  customerSuccess: number;
  total: number;
}

export function useActionRelatedCounts() {
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState<ActionRelatedCounts | null>(null);

  const fetchCounts = useCallback(async (actionId: string, projectId?: string | null, foccoProjectNumber?: string | null) => {
    setIsLoading(true);
    
    try {
      let effectiveProjectId = projectId;
      
      // If no project_id, try to find by focco_project_number
      if (!effectiveProjectId && foccoProjectNumber) {
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('focco_project_number', foccoProjectNumber)
          .maybeSingle();
        
        if (project) {
          effectiveProjectId = project.id;
        }
      }
      
      // Count credit transactions linked to this action
      const { count: creditCount } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('action_id', actionId);
      
      let clientId: string | null = null;
      let hasProject = false;
      let hasClient = false;
      let csActionsCount = 0;
      let csCasesCount = 0;
      let technicalAssistanceCount = 0;
      let clientInteractionsCount = 0;
      let customerSuccessCount = 0;
      
      if (effectiveProjectId) {
        hasProject = true;
        
        // Get client_id from project
        const { data: project } = await supabase
          .from('projects')
          .select('client_id')
          .eq('id', effectiveProjectId)
          .maybeSingle();
        
        clientId = project?.client_id || null;
        hasClient = !!clientId;
        
        // Count CS cases linked to project
        const { count: csCases } = await supabase
          .from('cs_cases')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', effectiveProjectId);
        csCasesCount = csCases || 0;
        
        // Count CS actions from those cases
        if (csCasesCount > 0) {
          const { data: cases } = await supabase
            .from('cs_cases')
            .select('id')
            .eq('project_id', effectiveProjectId);
          
          if (cases && cases.length > 0) {
            const caseIds = cases.map(c => c.id);
            const { count: csActions } = await supabase
              .from('cs_actions')
              .select('*', { count: 'exact', head: true })
              .in('cs_case_id', caseIds);
            csActionsCount = csActions || 0;
          }
        }
        
        // Count technical assistance linked to project
        const { count: taCount } = await supabase
          .from('technical_assistance')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', effectiveProjectId);
        technicalAssistanceCount = taCount || 0;
        
        // If we have a client, count client-related records
        if (clientId) {
          const { count: interactions } = await supabase
            .from('client_interactions')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId);
          clientInteractionsCount = interactions || 0;
          
          const { count: cs } = await supabase
            .from('customer_success')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId);
          customerSuccessCount = cs || 0;
        }
      }
      
      const result: ActionRelatedCounts = {
        creditTransactions: creditCount || 0,
        project: hasProject,
        client: hasClient,
        csActions: csActionsCount,
        csCases: csCasesCount,
        technicalAssistance: technicalAssistanceCount,
        clientInteractions: clientInteractionsCount,
        customerSuccess: customerSuccessCount,
        total: (creditCount || 0) + 
               (hasProject ? 1 : 0) + 
               (hasClient ? 1 : 0) + 
               csActionsCount + 
               csCasesCount + 
               technicalAssistanceCount + 
               clientInteractionsCount + 
               customerSuccessCount,
      };
      
      setCounts(result);
      return result;
    } catch (error) {
      console.error('Error fetching action related counts:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCounts(null);
  }, []);

  return { counts, isLoading, fetchCounts, reset };
}
