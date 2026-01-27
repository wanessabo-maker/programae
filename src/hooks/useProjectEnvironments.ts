import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, format } from 'date-fns';

export interface ProjectEnvironment {
  id: string;
  environment_type: 'apresentacao' | 'tecnico';
  environment_count: number;
  project_id: string | null;
  action_id: string | null;
  checklist_item_id: string | null;
  projetista_id: string;
  consultant_id: string | null;
  competence_month: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectEnvironmentWithDetails extends ProjectEnvironment {
  projetista?: { id: string; name: string } | null;
  consultant?: { id: string; name: string } | null;
  project?: { id: string; name: string; focco_project_number: string | null } | null;
}

// Fetch environments for a specific month
export function useMonthlyEnvironments(year: number, month: number) {
  const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['project-environments', 'monthly', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_environments')
        .select(`
          *,
          projetista:team_members!project_environments_projetista_id_fkey(id, name),
          consultant:team_members!project_environments_consultant_id_fkey(id, name),
          project:projects(id, name, focco_project_number)
        `)
        .eq('competence_month', competenceMonth)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectEnvironmentWithDetails[];
    },
  });
}

// Fetch environments for a specific projetista
export function useProjetistaEnvironments(projetistaId: string | undefined, year: number, month: number) {
  const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['project-environments', 'projetista', projetistaId, year, month],
    queryFn: async () => {
      if (!projetistaId) return [];
      
      const { data, error } = await supabase
        .from('project_environments')
        .select(`
          *,
          consultant:team_members!project_environments_consultant_id_fkey(id, name),
          project:projects(id, name, focco_project_number)
        `)
        .eq('projetista_id', projetistaId)
        .eq('competence_month', competenceMonth)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectEnvironmentWithDetails[];
    },
    enabled: !!projetistaId,
  });
}

// Get monthly summary stats
export function useMonthlyEnvironmentStats(year: number, month: number) {
  const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['project-environments', 'stats', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_environments')
        .select('environment_type, environment_count, projetista_id')
        .eq('competence_month', competenceMonth);

      if (error) throw error;

      // Calculate totals
      const apresentacao = data
        .filter(e => e.environment_type === 'apresentacao')
        .reduce((sum, e) => sum + (e.environment_count || 0), 0);

      const tecnico = data
        .filter(e => e.environment_type === 'tecnico')
        .reduce((sum, e) => sum + (e.environment_count || 0), 0);

      // Group by projetista
      const byProjetista: Record<string, { apresentacao: number; tecnico: number }> = {};
      data.forEach(env => {
        if (!byProjetista[env.projetista_id]) {
          byProjetista[env.projetista_id] = { apresentacao: 0, tecnico: 0 };
        }
        byProjetista[env.projetista_id][env.environment_type as 'apresentacao' | 'tecnico'] += 
          env.environment_count || 0;
      });

      return {
        totalApresentacao: apresentacao,
        totalTecnico: tecnico,
        byProjetista,
      };
    },
  });
}

// Create environment record
export function useCreateProjectEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      environment_type: 'apresentacao' | 'tecnico';
      environment_count: number;
      projetista_id: string;
      consultant_id?: string;
      project_id?: string;
      action_id?: string;
      checklist_item_id?: string;
      competence_date: string; // Date to derive competence month from
      notes?: string;
    }) => {
      // Calculate competence month (first day of the month)
      const competenceMonth = format(startOfMonth(new Date(data.competence_date)), 'yyyy-MM-dd');

      const { data: result, error } = await supabase
        .from('project_environments')
        .insert({
          environment_type: data.environment_type,
          environment_count: data.environment_count,
          projetista_id: data.projetista_id,
          consultant_id: data.consultant_id || null,
          project_id: data.project_id || null,
          action_id: data.action_id || null,
          checklist_item_id: data.checklist_item_id || null,
          competence_month: competenceMonth,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-environments'] });
    },
    onError: (error) => {
      console.error('Error creating project environment:', error);
      toast.error('Erro ao registrar ambientes');
    },
  });
}

// Get ranking of projetistas for a month
export function useProjetistaRanking(year: number, month: number) {
  const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['project-environments', 'ranking', year, month],
    queryFn: async () => {
      const { data: environments, error } = await supabase
        .from('project_environments')
        .select('environment_type, environment_count, projetista_id')
        .eq('competence_month', competenceMonth);

      if (error) throw error;

      // Get unique projetista IDs
      const projetistaIds = [...new Set(environments.map(e => e.projetista_id))];
      
      if (projetistaIds.length === 0) {
        return { apresentacao: [], tecnico: [] };
      }

      // Fetch projetista names
      const { data: projetistas } = await supabase
        .from('team_members')
        .select('id, name')
        .in('id', projetistaIds);

      const projetistaMap = new Map(projetistas?.map(p => [p.id, p.name]) || []);

      // Calculate totals per projetista per type
      const totals: Record<string, { apresentacao: number; tecnico: number }> = {};
      environments.forEach(env => {
        if (!totals[env.projetista_id]) {
          totals[env.projetista_id] = { apresentacao: 0, tecnico: 0 };
        }
        totals[env.projetista_id][env.environment_type as 'apresentacao' | 'tecnico'] += 
          env.environment_count || 0;
      });

      // Create rankings
      const apresentacaoRanking = Object.entries(totals)
        .filter(([_, t]) => t.apresentacao > 0)
        .map(([id, t]) => ({
          projetistaId: id,
          projetistaName: projetistaMap.get(id) || 'Desconhecido',
          count: t.apresentacao,
        }))
        .sort((a, b) => b.count - a.count);

      const tecnicoRanking = Object.entries(totals)
        .filter(([_, t]) => t.tecnico > 0)
        .map(([id, t]) => ({
          projetistaId: id,
          projetistaName: projetistaMap.get(id) || 'Desconhecido',
          count: t.tecnico,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        apresentacao: apresentacaoRanking,
        tecnico: tecnicoRanking,
      };
    },
  });
}
