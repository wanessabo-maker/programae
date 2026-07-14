import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateCSActionsForCase } from '@/hooks/useCustomerSuccess';

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
  origin_type?: string | null; // 'standard' | 'venda_direta' | 'certificado_sem_venda'
  apresentacao_projetista_id?: string | null;
  // Joined data
  clients?: { name: string } | null;
  professionals?: { name: string } | null;
  responsible?: { name: string } | null;
}

export const PROJECT_STAGES = [
  { id: 'em_negociacao', name: 'Em Negociação', color: 'bg-yellow-500/20' },
  { id: 'closed_lost', name: 'Perdido', color: 'bg-red-500/20' },
  { id: 'closed_won', name: 'Vendido', color: 'bg-green-500/20' },
  { id: 'delivered', name: 'Entregue', color: 'bg-blue-500/20' },
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
      const { clients: _c, professionals: _p, responsible: _r, ...rest } = updates as any;
      const { data, error } = await supabase
        .from('projects')
        .update(rest)
        .eq('id', id)
        .select('*, clients(name, contract_number), responsible:team_members!projects_responsible_id_fkey(name)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (updatedProject: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.refetchQueries({ queryKey: ['projects'] });
      if (updatedProject?.stage === 'delivered' || updatedProject?.actual_delivery) {
        await autoCreateCSCase(updatedProject, queryClient);
      }
    },
  });
}

async function autoCreateCSCase(project: any, queryClient: any) {
  try {
    const { data: existingCase } = await supabase
      .from('cs_cases')
      .select('id')
      .eq('project_id', project.id)
      .maybeSingle();
    if (existingCase) return;

    const { data: schedules, error: schedulesError } = await supabase
      .from('cs_contact_schedules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (schedulesError || !schedules?.length) {
      console.error('CS: cronograma de contatos não encontrado', schedulesError);
      return;
    }

    const signatureDate = project.actual_delivery
      || project.expected_delivery
      || new Date().toISOString().split('T')[0];

    const contractNumber = project.clients?.contract_number
      || project.focco_project_number
      || `CS-${project.id.slice(0, 8).toUpperCase()}`;

    const { data: newCase, error: caseError } = await supabase
      .from('cs_cases')
      .insert({
        client_id: project.client_id,
        project_id: project.id,
        contract_number: contractNumber,
        signature_date: signatureDate,
        responsible_id: project.responsible_id,
        status: 'active',
        notes: `Caso criado automaticamente após entrega do projeto em ${signatureDate}.`,
      })
      .select()
      .single();
    if (caseError) throw caseError;

    await generateCSActionsForCase(newCase.id, signatureDate, schedules);

    queryClient.invalidateQueries({ queryKey: ['cs_cases'] });
    queryClient.invalidateQueries({ queryKey: ['cs_actions'] });

    const clientName = project.clients?.name || 'Cliente';
    toast.success(`CS aberto automaticamente para ${clientName}`, {
      description: `${schedules.length} contato(s) agendado(s) a partir de ${signatureDate}`,
      duration: 6000,
    });
  } catch (err: any) {
    console.error('Erro ao criar CS automático:', err);
    toast.error('Atenção: não foi possível criar o caso CS automaticamente', {
      description: 'Acesse CS & AT para criar manualmente.',
      duration: 8000,
    });
  }
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
