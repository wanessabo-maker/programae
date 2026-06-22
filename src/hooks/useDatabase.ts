import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// ─── Helper: toast de erro padronizado ────────────────────────────────────────
// Garante que qualquer falha de escrita aparece para o usuário em português
function onMutationError(context: string) {
  return (error: unknown) => {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    toast({ title: `Erro ao ${context}`, description: msg, variant: 'destructive' });
  };
}

// ─── Areas ────────────────────────────────────────────────────────────────────
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
    onError: onMutationError('criar área'),
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
    onError: onMutationError('atualizar área'),
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
    onError: onMutationError('excluir área'),
  });
}

// ─── Team Members ─────────────────────────────────────────────────────────────
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team_members'] }),
    onError: onMutationError('criar colaborador'),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team_members'] }),
    onError: onMutationError('atualizar colaborador'),
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
    onError: onMutationError('excluir colaborador'),
  });
}

// ─── Professional Types ───────────────────────────────────────────────────────
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professional_types'] }),
    onError: onMutationError('criar tipo de profissional'),
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
    onError: onMutationError('atualizar tipo de profissional'),
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
    onError: onMutationError('excluir tipo de profissional'),
  });
}

// ─── Professional Categories ──────────────────────────────────────────────────
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professional_categories'] }),
    onError: onMutationError('criar categoria'),
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
    onError: onMutationError('atualizar categoria'),
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
    onError: onMutationError('excluir categoria'),
  });
}

// ─── Action Types ─────────────────────────────────────────────────────────────
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
      name: string; classification: string; impacts: string[]; requires_value: string;
      additional_fields: boolean; enabled_fields?: string[]; points: number;
      bonus_points_with_professional?: number; credit_validity_type?: string;
      credit_validity_days?: number | null; area_id?: string | null;
    }) => {
      const { data, error } = await supabase.from('action_types').insert(actionType).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['action_types'] }),
    onError: onMutationError('criar tipo de ação'),
  });
}

export function useUpdateActionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; name?: string; classification?: string; impacts?: string[];
      requires_value?: string; additional_fields?: boolean; enabled_fields?: string[];
      points?: number; bonus_points_with_professional?: number; credit_validity_type?: string;
      credit_validity_days?: number | null; area_id?: string | null;
    }) => {
      const { data, error } = await supabase.from('action_types').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['action_types'] }),
    onError: onMutationError('atualizar tipo de ação'),
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
    onError: onMutationError('excluir tipo de ação'),
  });
}

// ─── Goals ────────────────────────────────────────────────────────────────────
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
      area_id: string; team_member_id?: string; metric: string; value: number;
      category_id?: string; validity_type?: string; start_date?: string; end_date?: string; is_active?: boolean;
      sales_channel?: string | null;
    }) => {
      const { data, error } = await supabase.from('goals').insert(goal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
    onError: onMutationError('criar meta'),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; area_id?: string; team_member_id?: string; metric?: string; value?: number;
      category_id?: string; validity_type?: string; start_date?: string; end_date?: string; is_active?: boolean;
      sales_channel?: string | null;
    }) => {
      const { data, error } = await supabase.from('goals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
    onError: onMutationError('atualizar meta'),
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
    onError: onMutationError('excluir meta'),
  });
}

// ─── Rewards ──────────────────────────────────────────────────────────────────
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rewards'] }),
    onError: onMutationError('criar recompensa'),
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
    onError: onMutationError('atualizar recompensa'),
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
    onError: onMutationError('excluir recompensa'),
  });
}

// ─── Professionals ────────────────────────────────────────────────────────────
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
      name: string; type_id: string | null; consultant_id: string | null;
      category_id: string | null; last_action_date?: string | null; last_action_type_id?: string | null;
    }) => {
      const { data, error } = await supabase.from('professionals').insert(professional).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals'] }),
    onError: onMutationError('criar especificador'),
  });
}

export function useUpdateProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; name?: string; type_id?: string | null; consultant_id?: string | null;
      category_id?: string | null; last_action_date?: string | null;
      last_action_type_id?: string | null; is_manual_category?: boolean;
    }) => {
      const { data, error } = await supabase.from('professionals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals'] }),
    onError: onMutationError('atualizar especificador'),
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
    onError: onMutationError('excluir especificador'),
  });
}

// ─── Actions ──────────────────────────────────────────────────────────────────
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
      consultant_id: string | null; professional_id: string | null; action_type_id: string | null;
      action_date: string; value?: number | null; client_name?: string | null; client_age?: number | null;
      client_profession?: string | null; presentation_number?: string | null;
      focco_project_number?: string | null; project_id?: string | null; notes?: string | null;
    }) => {
      const { data, error } = await supabase.from('actions').insert(action).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // invalidateQueries já dispara refetch automaticamente — não chamar refetchQueries separado
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: onMutationError('registrar ação'),
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; consultant_id?: string | null; professional_id?: string | null;
      action_type_id?: string | null; action_date?: string; value?: number | null;
      client_name?: string | null; client_age?: number | null; client_profession?: string | null;
      presentation_number?: string | null; notes?: string | null;
    }) => {
      const { data, error } = await supabase.from('actions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      // Indicadores e dashboards derivados de ações precisam revalidar
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['project_value_history'] });
      queryClient.invalidateQueries({ queryKey: ['project_environments'] });
      // Indicadores comerciais / projetos / dashboard
      queryClient.invalidateQueries({ queryKey: ['commercial-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-indicators-envs-v2'] });
      queryClient.invalidateQueries({ queryKey: ['project-indicators-all-projects'] });
      queryClient.invalidateQueries({ queryKey: ['carteira-flutuante-presentations'] });
      queryClient.invalidateQueries({ queryKey: ['carteira-flutuante-value-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-action-presented-values'] });
      queryClient.invalidateQueries({ queryKey: ['consultant_balance'] });
    },
    onError: onMutationError('atualizar ação'),
  });
}

export function useDeleteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: action, error: actionError } = await supabase
        .from('actions').select('project_id, focco_project_number, consultant_id').eq('id', id).single();
      if (actionError) throw actionError;

      await supabase.from('credit_transactions').delete().eq('action_id', id);

      if (action?.project_id) {
        const { data: project } = await supabase
          .from('projects').select('client_id').eq('id', action.project_id).single();

        if (project?.client_id) {
          const { data: csCases } = await supabase
            .from('cs_cases').select('id').eq('client_id', project.client_id);
          if (csCases?.length) {
            await supabase.from('cs_actions').delete().in('cs_case_id', csCases.map(c => c.id));
            await supabase.from('cs_cases').delete().eq('client_id', project.client_id);
          }
          await supabase.from('technical_assistance').delete().eq('client_id', project.client_id);
          await supabase.from('customer_success').delete().eq('client_id', project.client_id);
          await supabase.from('client_interactions').delete().eq('client_id', project.client_id);
          await supabase.from('clients').delete().eq('id', project.client_id);
        }
        await supabase.from('projects').delete().eq('id', action.project_id);
      }

      const { error } = await supabase.from('actions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      ['actions','professionals','credit_transactions','projects','clients',
       'cs_cases','cs_actions','technical_assistance','customer_success'].forEach(key =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    },
    onError: onMutationError('excluir ação'),
  });
}

// ─── Reminders ────────────────────────────────────────────────────────────────
export function useReminders() {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders').select('*, team_members(name)').order('reminder_date');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: { title: string; reminder_date: string; consultant_id: string | null; recurrence?: string }) => {
      const { data, error } = await supabase.from('reminders').insert(reminder).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
    onError: onMutationError('criar lembrete'),
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; reminder_date?: string; consultant_id?: string | null; recurrence?: string }) => {
      const { data, error } = await supabase.from('reminders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
    onError: onMutationError('atualizar lembrete'),
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
    onError: onMutationError('excluir lembrete'),
  });
}

// ─── Credit Transactions ──────────────────────────────────────────────────────
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
      consultant_id: string | null; professional_id?: string | null; action_id?: string | null;
      points: number; description?: string; transaction_date?: string; expires_at?: string; status?: string;
    }) => {
      const { data, error } = await supabase.from('credit_transactions').insert(transaction).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_transactions'] }),
    onError: onMutationError('registrar crédito'),
  });
}

export function useUpdateCreditTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; expires_at?: string; status?: string; description?: string;
      consultant_id?: string; points?: number; transaction_date?: string;
    }) => {
      const { data, error } = await supabase.from('credit_transactions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_transactions'] }),
    onError: onMutationError('atualizar crédito'),
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
    onError: onMutationError('excluir crédito'),
  });
}

// ─── System Settings ──────────────────────────────────────────────────────────
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
      // Usar upsert nativo — elimina o select+insert/update duplo do original
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({ key, value: value as any, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system_settings'] }),
    onError: onMutationError('salvar configuração'),
  });
}

// ─── Special Dates ────────────────────────────────────────────────────────────
export function useSpecialDates() {
  return useQuery({
    queryKey: ['special_dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_dates').select('*, professionals(name)').order('date_value');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSpecialDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (specialDate: { professional_id: string; date_value: string; recurrence?: string; reason?: string }) => {
      const { data, error } = await supabase.from('special_dates').insert(specialDate).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['special_dates'] }),
    onError: onMutationError('criar data especial'),
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
    onError: onMutationError('excluir data especial'),
  });
}

// ─── Consultant Balance ───────────────────────────────────────────────────────
export function useConsultantBalance(consultantId: string | null) {
  return useQuery({
    queryKey: ['consultant_balance', consultantId],
    queryFn: async () => {
      if (!consultantId) return 0;
      const { data, error } = await supabase
        .from('credit_transactions').select('points').eq('consultant_id', consultantId);
      if (error) throw error;
      return data?.reduce((acc, t) => acc + t.points, 0) || 0;
    },
    enabled: !!consultantId,
  });
}
