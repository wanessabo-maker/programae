import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePositions } from '@/hooks/usePositions';
import { parseISO, getMonth, getYear, startOfMonth, endOfMonth, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface CommercialMonthlyIndicators {
  memberId: string;
  memberName: string;
  // Atividade Comercial
  relacionamentos: number;
  apresentacoes: number;
  vendas: number;
  // Conversão
  taxaConversao: number; // apresentações → vendas %
  vendasDiretas: number; // vendas sem apresentação registrada
  // Resultado Financeiro
  valorVendido: number;
  ticketMedio: number;
  contratosFechados: number;
  // Funil Comercial
  projetosEmNegociacao: number;
  projetosVendidos: number;
  projetosPerdidos: number;
}

// Identify commercial area members
const COMERCIAL_AREA_KEYWORD = 'comercial';

export function useCommercialIndicators(year: number, month: number) {
  const { actions, actionTypes, teamMembers, professionals } = useApp();
  const { getMemberAreaIds, getAreaName, positions, memberPositions } = usePositions();

  // Fetch projects for the selected month
  const monthStart = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

  const { data: projects } = useQuery({
    queryKey: ['commercial-projects', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, status, stage, responsible_id, closed_date, closed_value, created_at, origin_type, focco_project_number');
      if (error) throw error;
      return data || [];
    },
  });

  // Identify commercial team members
  const commercialMemberIds = useMemo(() => {
    return teamMembers
      .filter(m => m.active)
      .filter(m => {
        const memberAreaIds = getMemberAreaIds(m.id);
        return memberAreaIds.some(areaId => {
          const areaName = getAreaName(areaId);
          return areaName.toLowerCase().includes(COMERCIAL_AREA_KEYWORD);
        });
      })
      .map(m => m.id);
  }, [teamMembers, getMemberAreaIds, getAreaName]);

  // Classify action types
  const actionTypeClassification = useMemo(() => {
    const map: Record<string, { classification: string; name: string; impactsMetas: string[] }> = {};
    actionTypes.forEach(at => {
      map[at.id] = {
        classification: at.classification,
        name: at.name,
        impactsMetas: at.impactsMetas,
      };
    });
    return map;
  }, [actionTypes]);

  const indicators = useMemo((): CommercialMonthlyIndicators[] => {
    if (!projects) return [];

    // Filter actions for the selected month
    const monthActions = actions.filter(a => {
      const d = parseISO(a.date);
      return getYear(d) === year && getMonth(d) === month - 1;
    });

    return commercialMemberIds.map(memberId => {
      const member = teamMembers.find(m => m.id === memberId);
      const memberActions = monthActions.filter(a => a.consultantId === memberId);

      // Atividade Comercial
      const relacionamentos = memberActions.filter(a => {
        const at = actionTypeClassification[a.actionTypeId];
        return at?.classification === 'relacionamento';
      }).length;

      const apresentacoes = memberActions.filter(a => {
        const at = actionTypeClassification[a.actionTypeId];
        return at?.classification === 'apresentacao' || at?.name?.toLowerCase().includes('apresentação');
      }).length;

      const vendasActions = memberActions.filter(a => {
        const at = actionTypeClassification[a.actionTypeId];
        return at?.classification === 'venda';
      });
      const vendasCount = vendasActions.length;

      // Conversão
      const taxaConversao = apresentacoes > 0 ? (vendasCount / apresentacoes) * 100 : 0;

      // Vendas diretas: vendas de projetos cujo origin_type é 'venda_direta'
      const vendaProjectIds = vendasActions
        .map(a => a.projectId)
        .filter(Boolean);
      const vendasDiretas = vendaProjectIds.filter(pid => {
        const proj = projects.find(p => p.id === pid);
        return proj?.origin_type === 'venda_direta';
      }).length;

      // Resultado Financeiro
      const valorVendido = vendasActions.reduce((sum, a) => sum + (a.value || 0), 0);
      const contratosFechados = vendasCount;
      const ticketMedio = contratosFechados > 0 ? valorVendido / contratosFechados : 0;

      // Funil Comercial: projects created by or assigned to this member
      const memberProjects = (projects || []).filter(p =>
        p.responsible_id === memberId
      );

      // Filter by month context: projects that were in certain stages during the month
      // em_negociacao: current stage
      const projetosEmNegociacao = memberProjects.filter(p =>
        p.stage === 'em_negociacao' || p.stage === 'lead'
      ).length;

      // Vendidos: closed_won with closed_date in the month
      const projetosVendidos = memberProjects.filter(p => {
        if (p.stage !== 'closed_won') return false;
        if (!p.closed_date) return false;
        const cd = parseISO(p.closed_date);
        return getYear(cd) === year && getMonth(cd) === month - 1;
      }).length;

      // Perdidos: closed_lost with updated status
      const projetosPerdidos = memberProjects.filter(p =>
        p.stage === 'closed_lost' || p.status === 'perdido'
      ).length;

      return {
        memberId,
        memberName: member?.name || '',
        relacionamentos,
        apresentacoes,
        vendas: vendasCount,
        taxaConversao,
        vendasDiretas,
        valorVendido,
        ticketMedio,
        contratosFechados,
        projetosEmNegociacao,
        projetosVendidos,
        projetosPerdidos,
      };
    });
  }, [actions, commercialMemberIds, teamMembers, actionTypeClassification, projects, year, month]);

  return {
    indicators,
    commercialMemberIds,
    isLoading: !projects,
  };
}
