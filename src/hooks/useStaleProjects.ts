import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';

export interface StaleProject {
  projectId: string;
  projectName: string;
  clientName: string | null;
  foccoNumber: string | null;
  lastApresentacaoDate: string;
  daysSince: number;
}

const STALE_DAYS = 90; // 3 meses

/**
 * Returns projects (em negociação) where the last "Apresentação de Projeto"
 * action happened 90+ days ago, scoped to projects the team member is
 * responsible for. Snoozed projects (snoozed_until > today) are filtered out.
 */
export function useStaleProjects(teamMemberId: string | undefined) {
  return useQuery({
    queryKey: ['stale-projects', teamMemberId],
    queryFn: async (): Promise<StaleProject[]> => {
      if (!teamMemberId) return [];

      // 1. Find action type for "Apresentação de Projeto"
      const { data: actionTypes } = await supabase
        .from('action_types')
        .select('id, name');

      const apresentacaoProjetoIds = (actionTypes || [])
        .filter((t) => {
          const n = t.name.toLowerCase();
          return n.includes('apresenta') && n.includes('projeto');
        })
        .map((t) => t.id);

      if (apresentacaoProjetoIds.length === 0) return [];

      // 2. Get projects where this team member is responsible/creator AND in negotiation
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, focco_project_number, stage, status, client_id, responsible_id, created_by, clients(name)')
        .or(`responsible_id.eq.${teamMemberId},created_by.eq.${teamMemberId}`)
        .not('stage', 'in', '(closed_won,closed_lost)');

      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);

      // 3. Get last Apresentação de Projeto action per project
      const { data: actions } = await supabase
        .from('actions')
        .select('project_id, action_date, action_type_id')
        .in('project_id', projectIds)
        .in('action_type_id', apresentacaoProjetoIds)
        .order('action_date', { ascending: false });

      const lastByProject = new Map<string, string>();
      (actions || []).forEach((a) => {
        if (a.project_id && !lastByProject.has(a.project_id)) {
          lastByProject.set(a.project_id, a.action_date);
        }
      });

      // 4. Get active snoozes
      const today = new Date().toISOString().slice(0, 10);
      const { data: snoozes } = await supabase
        .from('project_review_snoozes')
        .select('project_id, snoozed_until')
        .in('project_id', projectIds)
        .gte('snoozed_until', today);

      const snoozedSet = new Set((snoozes || []).map((s) => s.project_id));

      // 5. Build stale list
      const result: StaleProject[] = [];
      const now = new Date();

      projects.forEach((p) => {
        if (snoozedSet.has(p.id)) return;
        const lastDate = lastByProject.get(p.id);
        if (!lastDate) return;
        const days = differenceInDays(now, parseISO(lastDate));
        if (days >= STALE_DAYS) {
          result.push({
            projectId: p.id,
            projectName: p.name,
            clientName: (p.clients as any)?.name || null,
            foccoNumber: p.focco_project_number,
            lastApresentacaoDate: lastDate,
            daysSince: days,
          });
        }
      });

      return result.sort((a, b) => b.daysSince - a.daysSince);
    },
    enabled: !!teamMemberId,
  });
}

export function useMarkProjectLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .update({
          stage: 'closed_lost',
          status: 'lost',
          closed_date: new Date().toISOString().slice(0, 10),
        })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stale-projects'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['carteira-flutuante'] });
    },
  });
}

export function useSnoozeProjectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      teamMemberId,
      days,
    }: {
      projectId: string;
      teamMemberId: string;
      days: number;
    }) => {
      const until = new Date();
      until.setDate(until.getDate() + days);
      const { error } = await supabase.from('project_review_snoozes').insert({
        project_id: projectId,
        snoozed_by: teamMemberId,
        snoozed_until: until.toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stale-projects'] });
    },
  });
}
