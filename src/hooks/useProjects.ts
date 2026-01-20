import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  stage?: string | null;
  status?: string | null;
  estimated_value?: number | null;
  closed_value?: number | null;
  start_date?: string | null;
  expected_delivery?: string | null;
  actual_delivery?: string | null;
  closed_date?: string | null;
  notes?: string | null;
  client_id?: string | null;
  professional_id?: string | null;
  responsible_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  focco_project_number?: string | null;
  // Joined data
  clients?: { name: string } | null;
  professionals?: { name: string } | null;
  responsible?: { name: string } | null;
}

export const PROJECT_STAGES = [
  { id: 'em_negociacao', name: 'Em Negociação', color: 'bg-yellow-500/20' },
  { id: 'closed_lost', name: 'Perdido', color: 'bg-red-500/20' },
  { id: 'closed_won', name: 'Vendido', color: 'bg-green-500/20' },
] as const;

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name), professionals(name), responsible:team_members!projects_responsible_id_fkey(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name), professionals(name), responsible:team_members!projects_responsible_id_fkey(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useProjectByFocco(foccoNumber: string | null) {
  return useQuery({
    queryKey: ['projects', 'focco', foccoNumber],
    queryFn: async () => {
      if (!foccoNumber) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('focco_project_number', foccoNumber)
        .maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!foccoNumber,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'clients' | 'professionals' | 'responsible'>) => {
      const { data, error } = await supabase.from('projects').insert(project).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.refetchQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.refetchQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}

// Helper function for checking existing FOCCO project (non-hook for use in handlers)
export async function findProjectByFocco(foccoNumber: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('focco_project_number', foccoNumber)
    .maybeSingle();
  if (error) throw error;
  return data as Project | null;
}
