import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePositions } from '@/hooks/usePositions';
import { parseISO, getMonth, getYear, format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ProjectMonthlyIndicators {
  memberId: string;
  memberName: string;
  // Produção
  projetosRecebidos: number;
  projetosEmAndamento: number;
  projetosFinalizados: number;
  // Prazo
  dentroDoPrazo: number;
  foraDoPrazo: number;
  // Integração com Comercial
  convertidosEmVenda: number;
  perdidosAposApresentacao: number;
}

const PROJETOS_AREA_KEYWORD = 'projeto';

export function useProjectIndicators(year: number, month: number) {
  const { actions, actionTypes, teamMembers } = useApp();
  const { getMemberAreaIds, getAreaName } = usePositions();

  const monthStart = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

  // Fetch projects with delivery dates
  const { data: projects } = useQuery({
    queryKey: ['project-indicators-projects', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, status, stage, responsible_id, created_at, start_date, expected_delivery, actual_delivery, closed_date, focco_project_number, origin_type');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch project_environments to link projetistas to projects
  const { data: environments } = useQuery({
    queryKey: ['project-indicators-envs', year, month],
    queryFn: async () => {
      const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('project_environments')
        .select('projetista_id, project_id, environment_type, action_id')
        .eq('competence_month', competenceMonth);
      if (error) throw error;
      return data || [];
    },
  });

  // Identify project area members
  const projectMemberIds = useMemo(() => {
    return teamMembers
      .filter(m => m.active)
      .filter(m => {
        const memberAreaIds = getMemberAreaIds(m.id);
        return memberAreaIds.some(areaId => {
          const areaName = getAreaName(areaId);
          return areaName.toLowerCase().includes(PROJETOS_AREA_KEYWORD);
        });
      })
      .map(m => m.id);
  }, [teamMembers, getMemberAreaIds, getAreaName]);

  // Classify action types
  const actionTypeMap = useMemo(() => {
    const map: Record<string, { classification: string; name: string }> = {};
    actionTypes.forEach(at => {
      map[at.id] = { classification: at.classification, name: at.name };
    });
    return map;
  }, [actionTypes]);

  const indicators = useMemo((): ProjectMonthlyIndicators[] => {
    if (!projects || !environments) return [];

    // Actions in the selected month
    const monthActions = actions.filter(a => {
      const d = parseISO(a.date);
      return getYear(d) === year && getMonth(d) === month - 1;
    });

    return projectMemberIds.map(memberId => {
      const member = teamMembers.find(m => m.id === memberId);

      // Project IDs linked to this projetista via project_environments this month
      const memberEnvs = environments.filter(e => e.projetista_id === memberId);
      const linkedProjectIds = [...new Set(memberEnvs.map(e => e.project_id).filter(Boolean))];

      // Also find projects linked via actions where this member is the consultant (projetista registered actions)
      const memberActions = monthActions.filter(a => a.consultantId === memberId);
      const actionProjectIds = [...new Set(memberActions.map(a => a.projectId).filter(Boolean))];

      const allProjectIds = [...new Set([...linkedProjectIds, ...actionProjectIds])];
      const memberProjects = (projects || []).filter(p => allProjectIds.includes(p.id));

      // --- Produção ---
      // Recebidos: projects created in the month linked to this projetista
      const projetosRecebidos = memberProjects.filter(p => {
        if (!p.created_at) return false;
        const d = parseISO(p.created_at);
        return getYear(d) === year && getMonth(d) === month - 1;
      }).length;

      // Em andamento: projects in active stages
      const projetosEmAndamento = memberProjects.filter(p =>
        p.stage === 'em_negociacao' || p.stage === 'lead' || p.status === 'em_andamento'
      ).length;

      // Finalizados: projects closed (won or lost) in the month
      const projetosFinalizados = memberProjects.filter(p => {
        if (p.stage !== 'closed_won' && p.stage !== 'closed_lost' && p.status !== 'concluido' && p.status !== 'perdido') return false;
        const closedDate = p.closed_date || p.actual_delivery;
        if (!closedDate) return false;
        const d = parseISO(closedDate);
        return getYear(d) === year && getMonth(d) === month - 1;
      }).length;

      // --- Prazo ---
      // Delivered projects that have both expected_delivery and actual_delivery
      const deliveredProjects = memberProjects.filter(p => {
        const deliveryDate = p.actual_delivery || p.closed_date;
        if (!deliveryDate) return false;
        const d = parseISO(deliveryDate);
        return getYear(d) === year && getMonth(d) === month - 1;
      });

      const dentroDoPrazo = deliveredProjects.filter(p => {
        if (!p.expected_delivery) return true; // No deadline = on time
        const expected = parseISO(p.expected_delivery);
        const actual = parseISO(p.actual_delivery || p.closed_date || '');
        return actual <= expected;
      }).length;

      const foraDoPrazo = deliveredProjects.length - dentroDoPrazo;

      // --- Integração com Comercial ---
      // Convertidos em venda: projects that became closed_won
      const convertidosEmVenda = memberProjects.filter(p => {
        if (p.stage !== 'closed_won') return false;
        if (!p.closed_date) return false;
        const d = parseISO(p.closed_date);
        return getYear(d) === year && getMonth(d) === month - 1;
      }).length;

      // Perdidos após apresentação: projects that went closed_lost
      const perdidosAposApresentacao = memberProjects.filter(p => {
        return p.stage === 'closed_lost' || p.status === 'perdido';
      }).length;

      return {
        memberId,
        memberName: member?.name || '',
        projetosRecebidos,
        projetosEmAndamento,
        projetosFinalizados,
        dentroDoPrazo,
        foraDoPrazo,
        convertidosEmVenda,
        perdidosAposApresentacao,
      };
    });
  }, [actions, projectMemberIds, teamMembers, actionTypeMap, projects, environments, year, month]);

  return {
    indicators,
    projectMemberIds,
    isLoading: !projects || !environments,
  };
}
