import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =============================================
// TYPES
// =============================================

export interface ATActionType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TechnicalAssistance {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  client_id: string | null;
  project_id: string | null;
  responsible_id: string | null;
  opened_date: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  resolution_notes: string | null;
  contact_date: string | null;
  visit_date: string | null;
  solution_date: string | null;
  contract_number: string | null;
  action_type_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  project_name?: string;
  responsible_name?: string;
  action_type_name?: string;
}

// =============================================
// AT ACTION TYPES
// =============================================

export function useATActionTypes() {
  return useQuery({
    queryKey: ['at_action_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('at_action_types')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as ATActionType[];
    },
  });
}

export function useCreateATActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (actionType: Omit<ATActionType, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('at_action_types')
        .insert(actionType)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['at_action_types'] });
    },
  });
}

export function useUpdateATActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ATActionType> & { id: string }) => {
      const { data, error } = await supabase
        .from('at_action_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['at_action_types'] });
    },
  });
}

export function useDeleteATActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('at_action_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['at_action_types'] });
    },
  });
}

// =============================================
// TECHNICAL ASSISTANCE CASES
// =============================================

export function useTechnicalAssistances(status?: string) {
  return useQuery({
    queryKey: ['technical_assistance', status],
    queryFn: async () => {
      let query = supabase
        .from('technical_assistance')
        .select(`
          *,
          clients:client_id(name),
          projects:project_id(name),
          team_members:responsible_id(name),
          at_action_types:action_type_id(name)
        `)
        .order('opened_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((row: any) => ({
        ...row,
        client_name: row.clients?.name,
        project_name: row.projects?.name,
        responsible_name: row.team_members?.name,
        action_type_name: row.at_action_types?.name,
      })) as TechnicalAssistance[];
    },
  });
}

export function useOpenTechnicalAssistances() {
  return useTechnicalAssistances('open');
}

export function useCreateTechnicalAssistance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ta: {
      title: string;
      description?: string | null;
      priority?: string;
      client_id?: string | null;
      project_id?: string | null;
      responsible_id?: string | null;
      contact_date: string;
      scheduled_date?: string | null;
      contract_number?: string | null;
      action_type_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('technical_assistance')
        .insert({
          ...ta,
          status: 'open',
          opened_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical_assistance'] });
    },
  });
}

export function useUpdateTechnicalAssistance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TechnicalAssistance>) => {
      const { data, error } = await supabase
        .from('technical_assistance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical_assistance'] });
    },
  });
}

export function useDeleteTechnicalAssistance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technical_assistance')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical_assistance'] });
    },
  });
}

// =============================================
// CLOSE TECHNICAL ASSISTANCE (requires solution_date)
// =============================================

export function useCloseTechnicalAssistance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, solution_date, resolution_notes }: { 
      id: string; 
      solution_date: string; 
      resolution_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('technical_assistance')
        .update({
          status: 'closed',
          solution_date,
          completed_date: solution_date,
          resolution_notes,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical_assistance'] });
    },
  });
}
