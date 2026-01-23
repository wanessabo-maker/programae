import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =============================================
// TYPES
// =============================================

export interface CSContactSchedule {
  id: string;
  name: string;
  days_after_signature: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CSActionType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CSCase {
  id: string;
  client_id: string | null;
  project_id: string | null;
  contract_number: string;
  signature_date: string;
  responsible_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  project_name?: string;
  responsible_name?: string;
}

export interface CSAction {
  id: string;
  cs_case_id: string;
  schedule_id: string | null;
  action_type_id: string | null;
  scheduled_date: string;
  completed_date: string | null;
  performed_by: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  schedule_name?: string;
  action_type_name?: string;
  performed_by_name?: string;
  case_contract_number?: string;
  client_name?: string;
}

// =============================================
// CS CONTACT SCHEDULES (Periodicidade)
// =============================================

export function useCSContactSchedules() {
  return useQuery({
    queryKey: ['cs_contact_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_contact_schedules')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as CSContactSchedule[];
    },
  });
}

export function useCreateCSContactSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: Omit<CSContactSchedule, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('cs_contact_schedules')
        .insert(schedule)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_contact_schedules'] });
    },
  });
}

export function useUpdateCSContactSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CSContactSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('cs_contact_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_contact_schedules'] });
    },
  });
}

export function useDeleteCSContactSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_contact_schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_contact_schedules'] });
    },
  });
}

// =============================================
// CS ACTION TYPES
// =============================================

export function useCSActionTypes() {
  return useQuery({
    queryKey: ['cs_action_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_action_types')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as CSActionType[];
    },
  });
}

export function useCreateCSActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (actionType: Omit<CSActionType, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('cs_action_types')
        .insert(actionType)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_action_types'] });
    },
  });
}

export function useUpdateCSActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CSActionType> & { id: string }) => {
      const { data, error } = await supabase
        .from('cs_action_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_action_types'] });
    },
  });
}

export function useDeleteCSActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_action_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_action_types'] });
    },
  });
}

// =============================================
// CS CASES
// =============================================

export function useCSCases() {
  return useQuery({
    queryKey: ['cs_cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_cases')
        .select(`
          *,
          clients:client_id(name),
          projects:project_id(name),
          team_members:responsible_id(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((row: any) => ({
        ...row,
        client_name: row.clients?.name,
        project_name: row.projects?.name,
        responsible_name: row.team_members?.name,
      })) as CSCase[];
    },
  });
}

export function useCreateCSCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (csCase: {
      client_id: string | null;
      project_id: string | null;
      contract_number: string;
      signature_date: string;
      responsible_id: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('cs_cases')
        .insert(csCase)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_cases'] });
    },
  });
}

export function useUpdateCSCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CSCase>) => {
      const { data, error } = await supabase
        .from('cs_cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_cases'] });
    },
  });
}

export function useDeleteCSCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_cases')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_cases'] });
    },
  });
}

// =============================================
// CS ACTIONS
// =============================================

export function useCSActions(csCaseId?: string) {
  return useQuery({
    queryKey: ['cs_actions', csCaseId],
    queryFn: async () => {
      let query = supabase
        .from('cs_actions')
        .select(`
          *,
          cs_contact_schedules:schedule_id(name),
          cs_action_types:action_type_id(name),
          team_members:performed_by(name),
          cs_cases:cs_case_id(contract_number, clients:client_id(name))
        `)
        .order('scheduled_date', { ascending: true });

      if (csCaseId) {
        query = query.eq('cs_case_id', csCaseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((row: any) => ({
        ...row,
        schedule_name: row.cs_contact_schedules?.name,
        action_type_name: row.cs_action_types?.name,
        performed_by_name: row.team_members?.name,
        case_contract_number: row.cs_cases?.contract_number,
        client_name: row.cs_cases?.clients?.name,
      })) as CSAction[];
    },
  });
}

export function useUpcomingCSActions(days: number = 30) {
  return useQuery({
    queryKey: ['cs_actions_upcoming', days],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const { data, error } = await supabase
        .from('cs_actions')
        .select(`
          *,
          cs_contact_schedules:schedule_id(name),
          cs_action_types:action_type_id(name),
          team_members:performed_by(name),
          cs_cases:cs_case_id(contract_number, clients:client_id(name))
        `)
        .eq('status', 'pending')
        .gte('scheduled_date', today.toISOString().split('T')[0])
        .lte('scheduled_date', futureDate.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data.map((row: any) => ({
        ...row,
        schedule_name: row.cs_contact_schedules?.name,
        action_type_name: row.cs_action_types?.name,
        performed_by_name: row.team_members?.name,
        case_contract_number: row.cs_cases?.contract_number,
        client_name: row.cs_cases?.clients?.name,
      })) as CSAction[];
    },
  });
}

export function useCreateCSAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: {
      cs_case_id: string;
      schedule_id?: string | null;
      action_type_id?: string | null;
      scheduled_date: string;
      performed_by?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('cs_actions')
        .insert(action)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_actions'] });
      queryClient.invalidateQueries({ queryKey: ['cs_actions_upcoming'] });
    },
  });
}

export function useUpdateCSAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CSAction>) => {
      const { data, error } = await supabase
        .from('cs_actions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_actions'] });
      queryClient.invalidateQueries({ queryKey: ['cs_actions_upcoming'] });
    },
  });
}

export function useDeleteCSAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_actions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs_actions'] });
      queryClient.invalidateQueries({ queryKey: ['cs_actions_upcoming'] });
    },
  });
}

// =============================================
// UTILITY: Generate CS actions for a new case
// =============================================

export async function generateCSActionsForCase(
  csCaseId: string,
  signatureDate: string,
  schedules: CSContactSchedule[]
) {
  const actions = schedules
    .filter(s => s.is_active)
    .map(schedule => {
      const scheduledDate = new Date(signatureDate);
      scheduledDate.setDate(scheduledDate.getDate() + schedule.days_after_signature);
      return {
        cs_case_id: csCaseId,
        schedule_id: schedule.id,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'pending',
      };
    });

  if (actions.length > 0) {
    const { error } = await supabase.from('cs_actions').insert(actions);
    if (error) throw error;
  }
}
