import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChecklistTemplate {
  id: string;
  step_order: number;
  name: string;
  responsible_area: string;
  default_sla_days: number | null;
  workflow_status: string;
  is_active: boolean;
  created_at: string;
}

// Non-hook function to create checklist (for use in callbacks)
export async function createChecklistForProject(
  projectId: string,
  options?: {
    assignedProjetistaId?: string;
    assignedLogisticaId?: string;
    assignedCsId?: string;
    commercialResponsibleId?: string;
  }
): Promise<boolean> {
  try {
    // First, check if checklist already exists
    const { data: existingChecklist } = await supabase
      .from('contract_checklists')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (existingChecklist) {
      console.log('Checklist already exists for project:', projectId);
      return true;
    }

    // Fetch templates
    const { data: templates, error: templatesError } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('is_active', true)
      .order('step_order', { ascending: true });

    if (templatesError) throw templatesError;
    if (!templates?.length) {
      console.error('No checklist templates found');
      return false;
    }

    // Create the main checklist with assigned professionals
    const { data: checklist, error: checklistError } = await supabase
      .from('contract_checklists')
      .insert({
        project_id: projectId,
        workflow_status: 'formalizacao',
        current_step: 1,
        assigned_projetista_id: options?.assignedProjetistaId || null,
        assigned_logistica_id: options?.assignedLogisticaId || null,
        assigned_cs_id: options?.assignedCsId || null,
      })
      .select()
      .single();

    if (checklistError) throw checklistError;

    // Create all checklist items with assigned_to based on responsible_area
    const today = new Date();
    const items = templates.map((template: ChecklistTemplate, index: number) => {
      let dueDate = null;
      if (template.default_sla_days) {
        const date = new Date(today);
        date.setDate(date.getDate() + template.default_sla_days);
        dueDate = date.toISOString().split('T')[0];
      }

      // Determine the assigned_to based on area
      let assignedTo: string | null = null;
      if (template.responsible_area === 'comercial' && options?.commercialResponsibleId) {
        assignedTo = options.commercialResponsibleId;
      } else if (template.responsible_area === 'projetista_tecnico' && options?.assignedProjetistaId) {
        assignedTo = options.assignedProjetistaId;
      } else if (template.responsible_area === 'logistica' && options?.assignedLogisticaId) {
        assignedTo = options.assignedLogisticaId;
      } else if (template.responsible_area === 'cs' && options?.assignedCsId) {
        assignedTo = options.assignedCsId;
      }

      return {
        checklist_id: checklist.id,
        template_id: template.id,
        step_order: template.step_order,
        name: template.name,
        responsible_area: template.responsible_area,
        status: index === 0 ? 'active' : 'blocked',
        due_date: dueDate,
        assigned_to: assignedTo,
      };
    });

    const { error: itemsError } = await supabase
      .from('checklist_items')
      .insert(items);

    if (itemsError) throw itemsError;

    console.log('Checklist created successfully for project:', projectId);
    return true;
  } catch (error) {
    console.error('Error creating checklist:', error);
    return false;
  }
}

export interface ContractChecklist {
  id: string;
  project_id: string;
  workflow_status: string;
  current_step: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  template_id: string;
  step_order: number;
  name: string;
  responsible_area: string;
  status: 'blocked' | 'active' | 'completed';
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemWithDetails extends ChecklistItem {
  project?: {
    id: string;
    name: string;
    focco_project_number: string | null;
    clients?: {
      id: string;
      name: string;
    } | null;
  };
  checklist?: ContractChecklist;
}

export interface ChecklistHistory {
  id: string;
  checklist_item_id: string;
  action: string;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

// Fetch all checklist templates
export function useChecklistTemplates() {
  return useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_active', true)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data as ChecklistTemplate[];
    },
  });
}

// Fetch checklist for a specific project
export function useContractChecklist(projectId: string | null) {
  return useQuery({
    queryKey: ['contract-checklist', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('contract_checklists')
        .select(`
          *,
          checklist_items (
            *
          )
        `)
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// Fetch active checklist items for a user's area
// For commercial items, filters by the project's responsible_id (the consultant who closed the sale)
export function useMyActiveChecklistItems(userAreas: string[], currentTeamMemberId?: string) {
  return useQuery({
    queryKey: ['my-active-checklist-items', userAreas, currentTeamMemberId],
    queryFn: async () => {
      if (!userAreas.length) return [];

      // Map functional areas to checklist responsible areas
      const checklistAreas = userAreas.flatMap(area => {
        switch (area.toLowerCase()) {
          case 'comercial':
            return ['comercial'];
          case 'projetos':
            return ['projetista_tecnico'];
          case 'customer_success':
            return ['cs'];
          case 'assistencia_tecnica':
            return ['logistica'];
          default:
            return [area.toLowerCase()];
        }
      });

      const { data, error } = await supabase
        .from('checklist_items')
        .select(`
          *,
          checklist:contract_checklists (
            *,
            project:projects (
              id,
              name,
              focco_project_number,
              responsible_id,
              clients (
                id,
                name
              )
            )
          )
        `)
        .eq('status', 'active')
        .in('responsible_area', checklistAreas)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Transform the data and filter by assigned_to or area
      const transformedData = (data || []).map(item => ({
        ...item,
        project: item.checklist?.project,
        checklist: item.checklist ? { ...item.checklist, project: undefined } : undefined,
      })) as ChecklistItemWithDetails[];

      // Filter items based on assignment logic
      return transformedData.filter(item => {
        // If item has a specific assigned_to, only show to that person
        if ((item as any).assigned_to) {
          return (item as any).assigned_to === currentTeamMemberId;
        }
        
        // For commercial area without specific assignment, check project's responsible
        if (item.responsible_area === 'comercial') {
          const projectResponsibleId = (item as any).project?.responsible_id;
          // Commercial items always require matching the project's responsible
          return projectResponsibleId === currentTeamMemberId;
        }
        
        // For projetista_tecnico without specific assignment, check checklist's assigned_projetista_id
        if (item.responsible_area === 'projetista_tecnico') {
          const assignedProjetistaId = (item as any).checklist?.assigned_projetista_id;
          if (assignedProjetistaId) {
            return assignedProjetistaId === currentTeamMemberId;
          }
          // Legacy checklists without assignment: show to all projetistas
          return true;
        }
        
        // For logistica without specific assignment, check checklist's assigned_logistica_id
        if (item.responsible_area === 'logistica') {
          const assignedLogisticaId = (item as any).checklist?.assigned_logistica_id;
          if (assignedLogisticaId) {
            return assignedLogisticaId === currentTeamMemberId;
          }
          // Legacy checklists without assignment: show to all logistica
          return true;
        }
        
        // For CS without specific assignment, check checklist's assigned_cs_id
        if (item.responsible_area === 'cs') {
          const assignedCsId = (item as any).checklist?.assigned_cs_id;
          if (assignedCsId) {
            return assignedCsId === currentTeamMemberId;
          }
          // Legacy checklists without assignment: show to all CS
          return true;
        }
        
        // For other areas, show to all team members in that area
        return true;
      });
    },
    enabled: userAreas.length > 0,
  });
}

// Fetch ALL checklist items (active + blocked) for a user's area
// Shows future tasks but they cannot be completed
export function useMyAllChecklistItems(userAreas: string[], currentTeamMemberId?: string) {
  return useQuery({
    queryKey: ['my-all-checklist-items', userAreas, currentTeamMemberId],
    queryFn: async () => {
      if (!userAreas.length) return [];

      // Map functional areas to checklist responsible areas
      const checklistAreas = userAreas.flatMap(area => {
        switch (area.toLowerCase()) {
          case 'comercial':
            return ['comercial'];
          case 'projetos':
            return ['projetista_tecnico'];
          case 'customer_success':
            return ['cs'];
          case 'assistencia_tecnica':
            return ['logistica'];
          default:
            return [area.toLowerCase()];
        }
      });

      const { data, error } = await supabase
        .from('checklist_items')
        .select(`
          *,
          checklist:contract_checklists (
            *,
            project:projects (
              id,
              name,
              focco_project_number,
              responsible_id,
              clients (
                id,
                name
              )
            )
          )
        `)
        .in('status', ['active', 'blocked'])
        .in('responsible_area', checklistAreas)
        .order('step_order', { ascending: true });

      if (error) throw error;
      
      // Transform the data and filter by assigned_to or area
      const transformedData = (data || []).map(item => ({
        ...item,
        project: item.checklist?.project,
        checklist: item.checklist ? { ...item.checklist, project: undefined } : undefined,
      })) as ChecklistItemWithDetails[];

      // Filter items based on assignment logic
      // CRITICAL: If no currentTeamMemberId, user cannot see any items 
      // (they need to be linked to a team_member)
      if (!currentTeamMemberId) {
        console.warn('No currentTeamMemberId - user not linked to team_member');
        return [];
      }

      return transformedData.filter(item => {
        // If item has a specific assigned_to, only show to that person
        if ((item as any).assigned_to) {
          return (item as any).assigned_to === currentTeamMemberId;
        }
        
        // For commercial area without specific assignment, check project's responsible
        if (item.responsible_area === 'comercial') {
          const projectResponsibleId = (item as any).project?.responsible_id;
          // Commercial items always require matching the project's responsible
          return projectResponsibleId === currentTeamMemberId;
        }
        
        // For projetista_tecnico without specific assignment, check checklist's assigned_projetista_id
        if (item.responsible_area === 'projetista_tecnico') {
          const assignedProjetistaId = (item as any).checklist?.assigned_projetista_id;
          // If there's an assigned projetista, only show to them
          if (assignedProjetistaId) {
            return assignedProjetistaId === currentTeamMemberId;
          }
          // Legacy checklists without assignment: show to all projetistas (area-based)
          return true;
        }
        
        // For logistica without specific assignment, check checklist's assigned_logistica_id
        if (item.responsible_area === 'logistica') {
          const assignedLogisticaId = (item as any).checklist?.assigned_logistica_id;
          // If there's an assigned logistica, only show to them
          if (assignedLogisticaId) {
            return assignedLogisticaId === currentTeamMemberId;
          }
          // Legacy checklists without assignment: show to all logistica (area-based)
          return true;
        }
        
        // For CS without specific assignment, check checklist's assigned_cs_id
        if (item.responsible_area === 'cs') {
          const assignedCsId = (item as any).checklist?.assigned_cs_id;
          if (assignedCsId) {
            return assignedCsId === currentTeamMemberId;
          }
          // Legacy checklists without assignment: show to all CS
          return true;
        }
        
        // For other areas, show to all team members in that area
        return true;
      });
    },
    enabled: userAreas.length > 0,
  });
}

// Fetch ALL checklist items for specific projects (including all areas, all statuses)
// Used to display full checklist in contract cards with different styling for other areas
export function useAllProjectChecklistItems(projectIds: string[]) {
  return useQuery({
    queryKey: ['all-project-checklist-items', projectIds],
    queryFn: async () => {
      if (!projectIds.length) return [];

      const { data, error } = await supabase
        .from('checklist_items')
        .select(`
          *,
          checklist:contract_checklists!inner (
            id,
            project_id,
            workflow_status,
            assigned_projetista_id,
            assigned_logistica_id,
            assigned_cs_id
          )
        `)
        .in('checklist.project_id', projectIds)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });
}

// Fetch ALL checklist items for ALL projects (for admins to see full team overview)
export function useAllTeamChecklistItems(isAdmin: boolean) {
  return useQuery({
    queryKey: ['all-team-checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select(`
          *,
          checklist:contract_checklists (
            *,
            project:projects (
              id,
              name,
              focco_project_number,
              responsible_id,
              clients (
                id,
                name,
                contract_number
              )
            )
          ),
          assigned_member:team_members!checklist_items_assigned_to_fkey (
            id,
            name
          )
        `)
        .in('status', ['active', 'blocked', 'completed'])
        .order('step_order', { ascending: true });

      if (error) throw error;
      
      // Transform the data
      return (data || []).map(item => ({
        ...item,
        project: item.checklist?.project,
        checklist: item.checklist ? { ...item.checklist, project: undefined } : undefined,
      })) as ChecklistItemWithDetails[];
    },
    enabled: isAdmin,
  });
}

// Create checklist for a project (called when sale is registered)
export function useCreateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // First, fetch templates
      const { data: templates, error: templatesError } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_active', true)
        .order('step_order', { ascending: true });

      if (templatesError) throw templatesError;
      if (!templates?.length) throw new Error('No checklist templates found');

      // Create the main checklist
      const { data: checklist, error: checklistError } = await supabase
        .from('contract_checklists')
        .insert({
          project_id: projectId,
          workflow_status: 'formalizacao',
          current_step: 1,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Create all checklist items
      const today = new Date();
      const items = templates.map((template, index) => {
        let dueDate = null;
        if (template.default_sla_days) {
          const date = new Date(today);
          date.setDate(date.getDate() + template.default_sla_days);
          dueDate = date.toISOString().split('T')[0];
        }

        return {
          checklist_id: checklist.id,
          template_id: template.id,
          step_order: template.step_order,
          name: template.name,
          responsible_area: template.responsible_area,
          status: index === 0 ? 'active' : 'blocked',
          due_date: dueDate,
        };
      });

      const { error: itemsError } = await supabase
        .from('checklist_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return checklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-checklist-items'] });
    },
    onError: (error) => {
      console.error('Error creating checklist:', error);
      toast.error('Erro ao criar checklist do contrato');
    },
  });
}

// Complete a checklist item and activate the next one
export function useCompleteChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      notes, 
      completedBy 
    }: { 
      itemId: string; 
      notes?: string; 
      completedBy: string;
    }) => {
      // Get the current item
      const { data: currentItem, error: fetchError } = await supabase
        .from('checklist_items')
        .select('*, checklist:contract_checklists(*)')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;
      if (currentItem.status !== 'active') {
        throw new Error('Este item não está ativo');
      }

      // Update the current item as completed
      const { error: updateError } = await supabase
        .from('checklist_items')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: completedBy,
          notes: notes || currentItem.notes,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Add to history
      await supabase.from('checklist_history').insert({
        checklist_item_id: itemId,
        action: 'completed',
        performed_by: completedBy,
        notes: notes,
      });

      // Find and activate the next item
      const { data: nextItem, error: nextError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', currentItem.checklist_id)
        .eq('step_order', currentItem.step_order + 1)
        .single();

      if (!nextError && nextItem) {
        // Calculate new due date based on template SLA
        const { data: template } = await supabase
          .from('checklist_templates')
          .select('default_sla_days')
          .eq('id', nextItem.template_id)
          .single();

        let dueDate = null;
        if (template?.default_sla_days) {
          const date = new Date();
          date.setDate(date.getDate() + template.default_sla_days);
          dueDate = date.toISOString().split('T')[0];
        }

        await supabase
          .from('checklist_items')
          .update({ 
            status: 'active',
            due_date: dueDate,
          })
          .eq('id', nextItem.id);

        // Update workflow status if needed
        const { data: nextTemplate } = await supabase
          .from('checklist_templates')
          .select('workflow_status')
          .eq('id', nextItem.template_id)
          .single();

        if (nextTemplate && nextTemplate.workflow_status !== currentItem.checklist.workflow_status) {
          await supabase
            .from('contract_checklists')
            .update({ 
              workflow_status: nextTemplate.workflow_status,
              current_step: nextItem.step_order,
            })
            .eq('id', currentItem.checklist_id);
        } else {
          await supabase
            .from('contract_checklists')
            .update({ current_step: nextItem.step_order })
            .eq('id', currentItem.checklist_id);
        }
      } else {
        // No next item - checklist is complete
        await supabase
          .from('contract_checklists')
          .update({ 
            is_completed: true,
            completed_at: new Date().toISOString(),
            workflow_status: 'encerrado',
          })
          .eq('id', currentItem.checklist_id);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['my-all-checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-project-checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Atividade concluída com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error completing checklist item:', error);
      toast.error(error.message || 'Erro ao concluir atividade');
    },
  });
}

// Update checklist template SLA (admin only)
export function useUpdateTemplateSLA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, slaDays }: { templateId: string; slaDays: number | null }) => {
      const { error } = await supabase
        .from('checklist_templates')
        .update({ default_sla_days: slaDays })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success('SLA atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating template SLA:', error);
      toast.error('Erro ao atualizar SLA');
    },
  });
}

// Get workflow status label
export function getWorkflowStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    formalizacao: 'Venda em Formalização',
    desenvolvimento_tecnico: 'Em Desenvolvimento Técnico',
    aprovacao_comercial: 'Aguardando Aprovação Comercial',
    implantacao_tecnica: 'Implantação Técnica',
    logistica_entrega: 'Logística e Entrega',
    encerramento_cs: 'Venda em Encerramento (CS)',
    encerrado: 'Encerrado',
  };
  return labels[status] || status;
}

// Get area label for display
export function getResponsibleAreaLabel(area: string): string {
  const labels: Record<string, string> = {
    comercial: 'Comercial',
    projetista_tecnico: 'Projetista Técnico',
    logistica: 'Analista de Logística',
    cs: 'Analista de CS',
  };
  return labels[area] || area;
}
