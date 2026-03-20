import { useMemo } from 'react';
import { usePositions } from '@/hooks/usePositions';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ProjectMonthlyIndicators {
  memberId: string;
  memberName: string;
  // Produtividade
  ambientesApresentacao: number;
  ambientesReformaApresentacao: number;
  ambientesTecnico: number;
  ambientesReformaTecnico: number;
  totalAmbientes: number;
  // Conversão (apenas apresentação)
  projetosApresentados: number;
  projetosConvertidos: number;
  projetosNaoConvertidos: number;
  projetosEmNegociacao: number;
  taxaConversao: number;
  valorVendido: number;
  // Detalhes por FOCCO
  projetosDetalhe: {
    foccoNumber: string;
    ambientes: number;
    status: 'vendido' | 'em_negociacao' | 'perdido' | 'sem_projeto';
    valorVendido: number | null;
    actionTypeName: string;
  }[];
}

const PROJETOS_AREA_KEYWORD = 'projeto';

export function useProjectIndicators(year: number, month: number) {
  const { teamMembers } = useApp();
  const { getMemberAreaIds, getAreaName } = usePositions();

  const competenceMonth = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');

  // Fetch environments with action + action_type + project info
  const { data: environments, isLoading: envsLoading } = useQuery({
    queryKey: ['project-indicators-envs-v2', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_environments')
        .select(`
          id, projetista_id, environment_type, environment_count, project_id,
          action:actions!project_environments_action_id_fkey(
            id, focco_project_number, action_type_id,
            action_type:action_types!inner(id, name)
          ),
          project:projects(id, stage, closed_value, focco_project_number)
        `)
        .eq('competence_month', competenceMonth);
      if (error) throw error;
      return data || [];
    },
  });

  // Also fetch all projects to resolve FOCCO numbers that may not be linked via project_id
  const { data: allProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['project-indicators-all-projects', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, focco_project_number, stage, closed_value');
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

  const indicators = useMemo((): ProjectMonthlyIndicators[] => {
    if (!environments || !allProjects) return [];

    // Build FOCCO lookup
    const foccoToProject: Record<string, { stage: string; closed_value: number | null }> = {};
    allProjects.forEach(p => {
      if (p.focco_project_number) {
        foccoToProject[p.focco_project_number] = {
          stage: p.stage || '',
          closed_value: p.closed_value,
        };
      }
    });

    return projectMemberIds.map(memberId => {
      const member = teamMembers.find(m => m.id === memberId);
      const memberEnvs = environments.filter(e => e.projetista_id === memberId);

      const isReforma = (env: any) => {
        const name = env.action?.action_type?.name || '';
        return name.toLowerCase().includes('reforma');
      };

      // --- Produtividade ---
      const apresentacaoEnvs = memberEnvs.filter(e => e.environment_type === 'apresentacao');
      const tecnicoEnvs = memberEnvs.filter(e => e.environment_type === 'tecnico');

      const ambientesApresentacao = apresentacaoEnvs
        .filter(e => !isReforma(e))
        .reduce((s, e) => s + (e.environment_count || 0), 0);
      const ambientesReformaApresentacao = apresentacaoEnvs
        .filter(e => isReforma(e))
        .reduce((s, e) => s + (e.environment_count || 0), 0);
      const ambientesTecnico = tecnicoEnvs
        .filter(e => !isReforma(e))
        .reduce((s, e) => s + (e.environment_count || 0), 0);
      const ambientesReformaTecnico = tecnicoEnvs
        .filter(e => isReforma(e))
        .reduce((s, e) => s + (e.environment_count || 0), 0);

      const totalAmbientes = ambientesApresentacao + ambientesReformaApresentacao + ambientesTecnico + ambientesReformaTecnico;

      // --- Conversão (apenas apresentação) ---
      // Group by FOCCO number to avoid counting duplicates
      const foccoMap: Record<string, {
        ambientes: number;
        actionTypeName: string;
        projectStage: string | null;
        projectValue: number | null;
      }> = {};

      apresentacaoEnvs.forEach(env => {
        const focco = env.action?.focco_project_number;
        if (!focco) return;

        if (!foccoMap[focco]) {
          // Try to get project info from linked project or from FOCCO lookup
          const projectInfo = env.project
            ? { stage: env.project.stage, closed_value: env.project.closed_value }
            : foccoToProject[focco] || null;

          foccoMap[focco] = {
            ambientes: 0,
            actionTypeName: env.action?.action_type?.name || '',
            projectStage: projectInfo?.stage || null,
            projectValue: projectInfo?.closed_value || null,
          };
        }
        foccoMap[focco].ambientes += env.environment_count || 0;
      });

      const projetosDetalhe = Object.entries(foccoMap).map(([foccoNumber, info]) => {
        let status: 'vendido' | 'em_negociacao' | 'perdido' | 'sem_projeto' = 'sem_projeto';
        if (info.projectStage === 'closed_won') status = 'vendido';
        else if (info.projectStage === 'closed_lost') status = 'perdido';
        else if (info.projectStage === 'em_negociacao' || info.projectStage === 'lead') status = 'em_negociacao';

        return {
          foccoNumber,
          ambientes: info.ambientes,
          status,
          valorVendido: status === 'vendido' ? info.projectValue : null,
          actionTypeName: info.actionTypeName,
        };
      }).sort((a, b) => a.foccoNumber.localeCompare(b.foccoNumber, undefined, { numeric: true }));

      const projetosApresentados = projetosDetalhe.length;
      const projetosConvertidos = projetosDetalhe.filter(p => p.status === 'vendido').length;
      const projetosNaoConvertidos = projetosDetalhe.filter(p => p.status === 'perdido').length;
      const projetosEmNegociacao = projetosDetalhe.filter(p => p.status === 'em_negociacao' || p.status === 'sem_projeto').length;
      const taxaConversao = projetosApresentados > 0 ? (projetosConvertidos / projetosApresentados) * 100 : 0;
      const valorVendido = projetosDetalhe
        .filter(p => p.status === 'vendido' && p.valorVendido)
        .reduce((s, p) => s + (p.valorVendido || 0), 0);

      return {
        memberId,
        memberName: member?.name || '',
        ambientesApresentacao,
        ambientesReformaApresentacao,
        ambientesTecnico,
        ambientesReformaTecnico,
        totalAmbientes,
        projetosApresentados,
        projetosConvertidos,
        projetosNaoConvertidos,
        projetosEmNegociacao,
        taxaConversao,
        valorVendido,
        projetosDetalhe,
      };
    });
  }, [environments, allProjects, projectMemberIds, teamMembers]);

  return {
    indicators,
    projectMemberIds,
    isLoading: envsLoading || projectsLoading,
  };
}
