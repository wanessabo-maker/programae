import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cpf_cnpj?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  age?: number | null;
  profession?: string | null;
  preferences?: string | null;
  notes?: string | null;
  status?: string | null;
  origin_type?: string | null;
  potential_value?: number | null;
  contract_number?: string | null;
  professional_id?: string | null;
  responsible_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Joined data
  professionals?: { name: string } | null;
  responsible?: { name: string } | null;
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, professionals(name), responsible:team_members!clients_responsible_id_fkey(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*, professionals(name), responsible:team_members!clients_responsible_id_fkey(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'professionals' | 'team_members'>) => {
      const { data, error } = await supabase.from('clients').insert(client).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.refetchQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.refetchQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });
}

// Helper function for creating client directly (non-hook for use in handlers)
export async function createClientDirect(client: {
  name: string;
  age?: number | null;
  profession?: string | null;
  professional_id?: string | null;
  responsible_id?: string | null;
  created_by?: string | null;
  status?: string;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select('id')
    .single();
  if (error) throw error;
  return data?.id || null;
}

// Client Interactions
export interface ClientInteraction {
  id: string;
  client_id: string;
  interaction_type: string;
  interaction_date?: string | null;
  description?: string | null;
  team_member_id?: string | null;
  created_at?: string | null;
  team_members?: { name: string } | null;
}

export function useClientInteractions(clientId: string | null) {
  return useQuery({
    queryKey: ['client_interactions', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_interactions')
        .select('*, team_members(name)')
        .eq('client_id', clientId)
        .order('interaction_date', { ascending: false });
      if (error) throw error;
      return data as ClientInteraction[];
    },
    enabled: !!clientId,
  });
}

export function useCreateClientInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (interaction: Omit<ClientInteraction, 'id' | 'created_at' | 'team_members'>) => {
      const { data, error } = await supabase.from('client_interactions').insert(interaction).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client_interactions', variables.client_id] });
    },
  });
}
