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

// Get monthly summary stats - combining project_environments AND actions data
// Legacy compatibility: old "Projeto" actions (before environment tracking) = 10 environments each
export function useMonthlyEnvironmentStats(year: number, month: number) {
  const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd'); // Last day of month
  
  return useQuery({
    queryKey: ['project-environments', 'stats', year, month],
    queryFn: async () => {
      // Fetch from project_environments table with action type info
      const { data: envData, error: envError } = await supabase
        .from('project_environments')
        .select(`
          environment_type, environment_count, projetista_id, action_id,
          action:actions!project_environments_action_id_fkey(
            action_type_id,
            action_type:action_types!inner(id, name)
          )
        `)
        .eq('competence_month', competenceMonth);

      if (envError) throw envError;

      // Also fetch actions of type "Projeto de Apresentação" for this month (legacy fallback)
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select(`
          id,
          action_date,
          environment_count,
          consultant_id,
          action_type:action_types!inner(id, name)
        `)
        .gte('action_date', startDate)
        .lte('action_date', endDate)
        .ilike('action_types.name', '%projeto de apresentação%');

      if (actionsError) throw actionsError;

      // Split apresentação into regular and reforma
      const isReforma = (env: any) => {
        const actionTypeName = env.action?.action_type?.name || '';
        return actionTypeName.toLowerCase().includes('reforma');
      };

      const apresentacaoEnvs = (envData || []).filter(e => e.environment_type === 'apresentacao');
      
      const regularApresentacao = apresentacaoEnvs
        .filter(e => !isReforma(e))
        .reduce((sum, e) => sum + (e.environment_count || 0), 0);

      const reformaApresentacao = apresentacaoEnvs
        .filter(e => isReforma(e))
        .reduce((sum, e) => sum + (e.environment_count || 0), 0);

      const totalApresentacaoFromEnv = regularApresentacao + reformaApresentacao;

      const tecnico = (envData || [])
        .filter(e => e.environment_type === 'tecnico')
        .reduce((sum, e) => sum + (e.environment_count || 0), 0);

      // Calculate totals from actions (with legacy compatibility)
      const apresentacaoFromActions = (actionsData || []).reduce((sum, action) => {
        const envCount = action.environment_count ?? 10;
        return sum + envCount;
      }, 0);

      // Total environments (prefer environment_count from new system)
      const totalApresentacao = totalApresentacaoFromEnv > 0 
        ? totalApresentacaoFromEnv 
        : apresentacaoFromActions;

      const actionsCount = (actionsData || []).length;

      // Group by projetista
      const byProjetista: Record<string, { apresentacao: number; tecnico: number }> = {};
      (envData || []).forEach(env => {
        if (!byProjetista[env.projetista_id]) {
          byProjetista[env.projetista_id] = { apresentacao: 0, tecnico: 0 };
        }
        byProjetista[env.projetista_id][env.environment_type as 'apresentacao' | 'tecnico'] += 
          env.environment_count || 0;
      });

      return {
        totalApresentacao,
        regularApresentacao,
        reformaApresentacao,
        totalTecnico: tecnico,
        actionsCount,
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

// Get ranking of projetistas for a month - uses actions data as fallback
export function useProjetistaRanking(year: number, month: number) {
  const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['project-environments', 'ranking', year, month],
    queryFn: async () => {
      // Fetch from project_environments table
      const { data: environments, error } = await supabase
        .from('project_environments')
        .select('environment_type, environment_count, projetista_id')
        .eq('competence_month', competenceMonth);

      if (error) throw error;

      // Get consultant ranking from project_environments (commercial consultants served)
      const { data: envWithConsultants, error: envConsError } = await supabase
        .from('project_environments')
        .select('consultant_id, environment_count')
        .eq('competence_month', competenceMonth)
        .eq('environment_type', 'apresentacao')
        .not('consultant_id', 'is', null);

      if (envConsError) throw envConsError;

      // Get unique projetista IDs
      const projetistaIds = [...new Set(environments.map(e => e.projetista_id))];
      
      // Get consultant IDs from project_environments
      const consultantIds = [...new Set((envWithConsultants || []).map(e => e.consultant_id).filter(Boolean))];
      const allMemberIds = [...new Set([...projetistaIds, ...consultantIds])];

      // Fetch all team member names
      const { data: members } = await supabase
        .from('team_members')
        .select('id, name')
        .in('id', allMemberIds);

      const memberMap = new Map(members?.map(p => [p.id, p.name]) || []);

      // Calculate totals per projetista per type from project_environments
      const totals: Record<string, { apresentacao: number; tecnico: number }> = {};
      environments.forEach(env => {
        if (!totals[env.projetista_id]) {
          totals[env.projetista_id] = { apresentacao: 0, tecnico: 0 };
        }
        totals[env.projetista_id][env.environment_type as 'apresentacao' | 'tecnico'] += 
          env.environment_count || 0;
      });

      // Calculate consultant ranking from project_environments (commercial consultants served)
      const consultantTotals: Record<string, number> = {};
      (envWithConsultants || []).forEach(env => {
        if (env.consultant_id) {
          if (!consultantTotals[env.consultant_id]) {
            consultantTotals[env.consultant_id] = 0;
          }
          consultantTotals[env.consultant_id] += env.environment_count || 1;
        }
      });

      // Create rankings
      const apresentacaoRanking = Object.entries(totals)
        .filter(([_, t]) => t.apresentacao > 0)
        .map(([id, t]) => ({
          projetistaId: id,
          projetistaName: memberMap.get(id) || 'Desconhecido',
          count: t.apresentacao,
        }))
        .sort((a, b) => b.count - a.count);

      const tecnicoRanking = Object.entries(totals)
        .filter(([_, t]) => t.tecnico > 0)
        .map(([id, t]) => ({
          projetistaId: id,
          projetistaName: memberMap.get(id) || 'Desconhecido',
          count: t.tecnico,
        }))
        .sort((a, b) => b.count - a.count);

      // Consultant ranking (who received the most presentations)
      const consultantRanking = Object.entries(consultantTotals)
        .map(([id, count]) => ({
          consultantId: id,
          consultantName: memberMap.get(id) || 'Desconhecido',
          count,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        apresentacao: apresentacaoRanking,
        tecnico: tecnicoRanking,
        consultants: consultantRanking,
      };
    },
  });
}

// Hook to get projetista's own stats (for Minha Área)
export function useMyProjectStats(teamMemberId: string | undefined, year: number, month: number) {
  const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['project-environments', 'my-stats', teamMemberId, year, month],
    queryFn: async () => {
      if (!teamMemberId) return null;

      // Fetch from project_environments where I'm the projetista
      const { data: myEnvironments } = await supabase
        .from('project_environments')
        .select(`
          *,
          consultant:team_members!project_environments_consultant_id_fkey(id, name),
          project:projects(id, name, focco_project_number)
        `)
        .eq('projetista_id', teamMemberId)
        .eq('competence_month', competenceMonth)
        .order('created_at', { ascending: false });

      // Fetch actions where I'm the consultant (presentations I received)
      const { data: actionsReceived } = await supabase
        .from('actions')
        .select(`
          id,
          action_date,
          environment_count,
          action_type:action_types!inner(id, name),
          professional:professionals(id, name)
        `)
        .eq('consultant_id', teamMemberId)
        .gte('action_date', startDate)
        .lte('action_date', endDate)
        .ilike('action_types.name', '%projeto de apresentação%');

      const apresentacao = (myEnvironments || [])
        .filter(e => e.environment_type === 'apresentacao')
        .reduce((sum, e) => sum + (e.environment_count || 0), 0);

      const tecnico = (myEnvironments || [])
        .filter(e => e.environment_type === 'tecnico')
        .reduce((sum, e) => sum + (e.environment_count || 0), 0);

      const receivedCount = (actionsReceived || []).reduce(
        (sum, a) => sum + (a.environment_count || 1), 0
      );

      return {
        apresentacao,
        tecnico,
        received: receivedCount,
        receivedActions: actionsReceived || [],
        environments: myEnvironments || [],
      };
    },
    enabled: !!teamMemberId,
  });
}
