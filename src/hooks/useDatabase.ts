import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Areas
export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('areas').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('areas').insert({ name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      queryClient.refetchQueries({ queryKey: ['areas'] });
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.from('areas').update({ name }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('areas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
  });
}

// Team Members
export function useTeamMembers() {
  return useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('*, areas(name)').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (member: { name: string; area_id: string | null; active: boolean }) => {
      const { data, error } = await supabase.from('team_members').insert(member).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      queryClient.refetchQueries({ queryKey: ['team_members'] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; area_id?: string | null; active?: boolean; user_id?: string | null }) => {
      const { data, error } = await supabase.from('team_members').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      queryClient.refetchQueries({ queryKey: ['team_members'] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team_members'] }),
  });
}

// Professional Types
export function useProfessionalTypes() {
  return useQuery({
    queryKey: ['professional_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('professional_types').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProfessionalType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('professional_types').insert({ name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional_types'] });
      queryClient.refetchQueries({ queryKey: ['professional_types'] });
    },
  });
}

export function useUpdateProfessionalType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.from('professional_types').update({ name }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professional_types'] }),
  });
}

export function useDeleteProfessionalType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('professional_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professional_types'] }),
  });
}

// Professional Categories
export function useProfessionalCategories() {
  return useQuery({
    queryKey: ['professional_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('professional_categories').select('*').order('hierarchy');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProfessionalCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: { name: string; condition: string; days: number; hierarchy: number; points?: number }) => {
      const { data, error } = await supabase.from('professional_categories').insert(category).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional_categories'] });
      queryClient.refetchQueries({ queryKey: ['professional_categories'] });
    },
  });
}

export function useUpdateProfessionalCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; condition?: string; days?: number; hierarchy?: number; points?: number }) => {
      const { data, error } = await supabase.from('professional_categories').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professional_categories'] }),
  });
}

export function useDeleteProfessionalCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('professional_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professional_categories'] }),
  });
}

// Action Types
export function useActionTypes() {
  return useQuery({
    queryKey: ['action_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('action_types').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (actionType: {
      name: string;
      classification: string;
      impacts: string[];
      requires_value: boolean;
      additional_fields: boolean;
      enabled_fields?: string[];
      points: number;
      credit_validity_type?: string;
      credit_validity_days?: number | null;
    }) => {
      const { data, error } = await supabase.from('action_types').insert(actionType).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action_types'] });
      queryClient.refetchQueries({ queryKey: ['action_types'] });
    },
  });
}

export function useUpdateActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      classification?: string;
      impacts?: string[];
      requires_value?: boolean;
      additional_fields?: boolean;
      enabled_fields?: string[];
      points?: number;
      credit_validity_type?: string;
      credit_validity_days?: number | null;
    }) => {
      const { data, error } = await supabase.from('action_types').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['action_types'] }),
  });
}

export function useDeleteActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('action_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['action_types'] }),
  });
}

// Goals
export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('goals').select('*, areas(name), team_members(name)');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goal: { 
      area_id: string; 
      team_member_id?: string;
      metric: string; 
      value: number; 
      category_id?: string;
      validity_type?: string;
      start_date?: string;
      end_date?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase.from('goals').insert(goal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.refetchQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string; 
      area_id?: string; 
      team_member_id?: string;
      metric?: string; 
      value?: number; 
      category_id?: string;
      validity_type?: string;
      start_date?: string;
      end_date?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase.from('goals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

// Rewards
export function useRewards() {
  return useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rewards').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reward: { name: string; cost: number }) => {
      const { data, error } = await supabase.from('rewards').insert(reward).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.refetchQueries({ queryKey: ['rewards'] });
    },
  });
}

export function useUpdateReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; cost?: number }) => {
      const { data, error } = await supabase.from('rewards').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rewards'] }),
  });
}

export function useDeleteReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rewards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rewards'] }),
  });
}

// Professionals
export function useProfessionals() {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('*, professional_types(name), team_members(name), professional_categories(name, days), action_types(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (professional: {
      name: string;
      type_id: string | null;
      consultant_id: string | null;
      category_id: string | null;
      last_action_date?: string | null;
      last_action_type_id?: string | null;
    }) => {
      const { data, error } = await supabase.from('professionals').insert(professional).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      queryClient.refetchQueries({ queryKey: ['professionals'] });
    },
  });
}

export function useUpdateProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      type_id?: string | null;
      consultant_id?: string | null;
      category_id?: string | null;
      last_action_date?: string | null;
      last_action_type_id?: string | null;
      is_manual_category?: boolean;
    }) => {
      const { data, error } = await supabase.from('professionals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals'] }),
  });
}

export function useDeleteProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('professionals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals'] }),
  });
}

// Actions
export function useActions() {
  return useQuery({
    queryKey: ['actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actions')
        .select('*, team_members(name), professionals(name), action_types(name, points)')
        .order('action_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: {
      consultant_id: string | null;
      professional_id: string | null;
      action_type_id: string | null;
      action_date: string;
      value?: number | null;
      client_name?: string | null;
      client_age?: number | null;
      client_profession?: string | null;
      presentation_number?: string | null;
      focco_project_number?: string | null;
      project_id?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase.from('actions').insert(action).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.refetchQueries({ queryKey: ['actions'] });
    },
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      consultant_id?: string | null;
      professional_id?: string | null;
      action_type_id?: string | null;
      action_date?: string;
      value?: number | null;
      client_name?: string | null;
      client_age?: number | null;
      client_profession?: string | null;
      presentation_number?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase.from('actions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
    },
  });
}

export function useDeleteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // First, get the action to find related data
      const { data: action, error: actionError } = await supabase
        .from('actions')
        .select('project_id, focco_project_number, consultant_id')
        .eq('id', id)
        .single();
      
      if (actionError) throw actionError;
      
      // Delete credit transactions linked to this action
      await supabase.from('credit_transactions').delete().eq('action_id', id);
      
      // If action has a project_id, handle cascade deletion
      if (action?.project_id) {
        // Get project to find client_id
        const { data: project } = await supabase
          .from('projects')
          .select('client_id')
          .eq('id', action.project_id)
          .single();
        
        if (project?.client_id) {
          // Delete CS cases linked to client
          const { data: csCases } = await supabase
            .from('cs_cases')
            .select('id')
            .eq('client_id', project.client_id);
          
          if (csCases && csCases.length > 0) {
            const csCaseIds = csCases.map(c => c.id);
            // Delete CS actions linked to CS cases
            await supabase.from('cs_actions').delete().in('cs_case_id', csCaseIds);
            // Delete CS cases
            await supabase.from('cs_cases').delete().eq('client_id', project.client_id);
          }
          
          // Delete technical assistance linked to client
          await supabase.from('technical_assistance').delete().eq('client_id', project.client_id);
          
          // Delete customer success records linked to client
          await supabase.from('customer_success').delete().eq('client_id', project.client_id);
          
          // Delete client interactions
          await supabase.from('client_interactions').delete().eq('client_id', project.client_id);
          
          // Delete the client
          await supabase.from('clients').delete().eq('id', project.client_id);
        }
        
        // Delete the project
        await supabase.from('projects').delete().eq('id', action.project_id);
      }
      
      // Finally, delete the action
      const { error } = await supabase.from('actions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['cs_cases'] });
      queryClient.invalidateQueries({ queryKey: ['cs_actions'] });
      queryClient.invalidateQueries({ queryKey: ['technical_assistance'] });
      queryClient.invalidateQueries({ queryKey: ['customer_success'] });
    },
  });
}

// Reminders
export function useReminders() {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*, team_members(name)')
        .order('reminder_date');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: {
      title: string;
      reminder_date: string;
      consultant_id: string | null;
      recurrence?: string;
    }) => {
      const { data, error } = await supabase.from('reminders').insert(reminder).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.refetchQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      reminder_date?: string;
      consultant_id?: string | null;
      recurrence?: string;
    }) => {
      const { data, error } = await supabase.from('reminders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

// Credit Transactions
export function useCreditTransactions() {
  return useQuery({
    queryKey: ['credit_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*, team_members(name), professionals(name), actions(action_date)')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCreditTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: {
      consultant_id: string | null;
      professional_id?: string | null;
      action_id?: string | null;
      points: number;
      description?: string;
      transaction_date?: string;
      expires_at?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase.from('credit_transactions').insert(transaction).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.refetchQueries({ queryKey: ['credit_transactions'] });
    },
  });
}

export function useUpdateCreditTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      expires_at?: string;
      status?: string;
      description?: string;
      consultant_id?: string;
      points?: number;
      transaction_date?: string;
    }) => {
      const { data, error } = await supabase.from('credit_transactions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.refetchQueries({ queryKey: ['credit_transactions'] });
    },
  });
}

export function useDeleteCreditTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_transactions'] }),
  });
}

// System Settings
export function useSystemSettings() {
  return useQuery({
    queryKey: ['system_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      // First try to find if setting exists
      const { data: existing } = await supabase.from('system_settings').select('id').eq('key', key).single();
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('system_settings')
          .update({ value: value as any, updated_at: new Date().toISOString() })
          .eq('key', key)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('system_settings')
          .insert({ key, value: value as any })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_settings'] });
      queryClient.refetchQueries({ queryKey: ['system_settings'] });
    },
  });
}

// Special Dates
export function useSpecialDates() {
  return useQuery({
    queryKey: ['special_dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_dates')
        .select('*, professionals(name)')
        .order('date_value');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSpecialDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (specialDate: {
      professional_id: string;
      date_value: string;
      recurrence?: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.from('special_dates').insert(specialDate).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special_dates'] });
      queryClient.refetchQueries({ queryKey: ['special_dates'] });
    },
  });
}

export function useDeleteSpecialDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('special_dates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['special_dates'] }),
  });
}

// Utility: Get consultant balance
export function useConsultantBalance(consultantId: string | null) {
  return useQuery({
    queryKey: ['consultant_balance', consultantId],
    queryFn: async () => {
      if (!consultantId) return 0;
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('points')
        .eq('consultant_id', consultantId);
      if (error) throw error;
      return data?.reduce((acc, t) => acc + t.points, 0) || 0;
    },
    enabled: !!consultantId,
  });
}
