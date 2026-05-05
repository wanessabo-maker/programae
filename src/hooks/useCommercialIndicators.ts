import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePositions } from '@/hooks/usePositions';
import { parseISO, getMonth, getYear, startOfMonth, endOfMonth, format, differenceInCalendarDays } from 'date-fns';
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
  taxaConversao: number;
  vendasDiretas: number;
  // Resultado Financeiro
  valorVendido: number;
  ticketMedio: number;
  contratosFechados: number;
  // Funil Comercial
  projetosEmNegociacao: number;
  projetosVendidos: number;
  projetosPerdidos: number;
  // Performance (novos)
  tempoMedioVendaDias: number; // dias entre 1ª apresentação e fechamento
  apresentacoesMediasPorVenda: number;
  carteiraFlutuanteValor: number; // valor total em carteira ativa
}

const COMERCIAL_AREA_KEYWORD = 'comercial';

export function useCommercialIndicators(year: number, month: number) {
  const { actions, actionTypes, teamMembers } = useApp();
  const { getMemberAreaIds, getAreaName } = usePositions();

  const monthStart = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

  // ─── CORREÇÃO PRINCIPAL: filtrar projetos no banco, não em JS ───────────────
  // Antes: buscava TODOS os projetos e filtrava em memória — problema grave de
  // performance que piora exponencialmente com o crescimento do banco.
  // Agora: filtra por closed_date no mês OU em_negociacao (sem data de fechamento).
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['commercial-projects', year, month],
    queryFn: async () => {
      // Projetos fechados no mês selecionado
      const { data: closedProjects, error: closedError } = await supabase
        .from('projects')
        .select('id, status, stage, responsible_id, closed_date, closed_value, estimated_value, created_at, origin_type, focco_project_number')
        .gte('closed_date', monthStart)
        .lte('closed_date', monthEnd);
      if (closedError) throw closedError;

      // Projetos em negociação (sem data de fechamento — sempre relevantes)
      const { data: openProjects, error: openError } = await supabase
        .from('projects')
        .select('id, status, stage, responsible_id, closed_date, closed_value, estimated_value, created_at, origin_type, focco_project_number')
        .in('stage', ['em_negociacao', 'lead'])
        .is('closed_date', null);
      if (openError) throw openError;

      // Merge sem duplicatas
      const allProjects = [...(closedProjects || []), ...(openProjects || [])];
      const seen = new Set<string>();
      return allProjects.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    },
    staleTime: 1000 * 60 * 2, // cache de 2 minutos — dados comerciais não mudam a cada segundo
  });

  // Identificar membros da área comercial
  const commercialMemberIds = useMemo(() => {
    return teamMembers
      .filter(m => m.active)
      .filter(m => {
        const memberAreaIds = getMemberAreaIds(m.id);
        return memberAreaIds.some(areaId =>
          getAreaName(areaId).toLowerCase().includes(COMERCIAL_AREA_KEYWORD)
        );
      })
      .map(m => m.id);
  }, [teamMembers, getMemberAreaIds, getAreaName]);

  // Mapa de classificação dos tipos de ação (memo estável)
  const actionTypeClassification = useMemo(() => {
    const map: Record<string, { classification: string; name: string; impactsMetas: string[] }> = {};
    actionTypes.forEach(at => {
      map[at.id] = { classification: at.classification, name: at.name, impactsMetas: at.impactsMetas };
    });
    return map;
  }, [actionTypes]);

  // Ações filtradas pelo mês (evitar refiltragem dentro do map)
  const monthActions = useMemo(() => {
    return actions.filter(a => {
      const d = parseISO(a.date);
      return getYear(d) === year && getMonth(d) === month - 1;
    });
  }, [actions, year, month]);

  const indicators = useMemo((): CommercialMonthlyIndicators[] => {
    if (!projects) return [];

    return commercialMemberIds.map(memberId => {
      const member = teamMembers.find(m => m.id === memberId);
      const memberActions = monthActions.filter(a => a.consultantId === memberId);

      const relacionamentos = memberActions.filter(a =>
        actionTypeClassification[a.actionTypeId]?.classification === 'relacionamento'
      ).length;

      const apresentacoes = memberActions.filter(a => {
        const at = actionTypeClassification[a.actionTypeId];
        return at?.classification === 'apresentacao' || at?.name?.toLowerCase().includes('apresentação');
      }).length;

      const vendasActions = memberActions.filter(a =>
        actionTypeClassification[a.actionTypeId]?.classification === 'venda'
      );
      const vendasCount = vendasActions.length;

      const taxaConversao = apresentacoes > 0 ? (vendasCount / apresentacoes) * 100 : 0;

      const vendaProjectIds = vendasActions.map(a => a.projectId).filter(Boolean);
      const vendasDiretas = vendaProjectIds.filter(pid => {
        const proj = projects.find(p => p.id === pid);
        return proj?.origin_type === 'venda_direta';
      }).length;

      const valorVendido = vendasActions.reduce((sum, a) => sum + (a.value || 0), 0);
      const contratosFechados = vendasCount;
      const ticketMedio = contratosFechados > 0 ? valorVendido / contratosFechados : 0;

      const memberProjects = projects.filter(p => p.responsible_id === memberId);

      const projetosEmNegociacao = memberProjects.filter(p =>
        p.stage === 'em_negociacao' || p.stage === 'lead'
      ).length;

      const projetosVendidos = memberProjects.filter(p => {
        if (p.stage !== 'closed_won' || !p.closed_date) return false;
        const cd = parseISO(p.closed_date);
        return getYear(cd) === year && getMonth(cd) === month - 1;
      }).length;

      const projetosPerdidos = memberProjects.filter(p =>
        p.stage === 'closed_lost' || p.status === 'perdido'
      ).length;

      // ── Novos indicadores de performance ─────────────────────────────────
      // Para cada venda: ache as apresentações da mesma área (mesmo projeto),
      // pega a 1ª apresentação e calcula dias até o fechamento.
      const allMemberActions = actions.filter(a => a.consultantId === memberId);
      const apresentacoesPorProjeto = new Map<string, Date[]>();
      allMemberActions.forEach(a => {
        const at = actionTypeClassification[a.actionTypeId];
        const isApres = at?.classification === 'apresentacao' || at?.name?.toLowerCase().includes('apresentação');
        if (isApres && a.projectId) {
          const arr = apresentacoesPorProjeto.get(a.projectId) || [];
          arr.push(parseISO(a.date));
          apresentacoesPorProjeto.set(a.projectId, arr);
        }
      });

      let totalDias = 0;
      let countDias = 0;
      let totalApresPorVenda = 0;
      let countApresPorVenda = 0;
      vendasActions.forEach(v => {
        if (!v.projectId) return;
        const apres = apresentacoesPorProjeto.get(v.projectId) || [];
        if (apres.length > 0) {
          totalApresPorVenda += apres.length;
          countApresPorVenda += 1;
          const primeira = apres.sort((a, b) => a.getTime() - b.getTime())[0];
          const fechamento = parseISO(v.date);
          const dias = differenceInCalendarDays(fechamento, primeira);
          if (dias >= 0) {
            totalDias += dias;
            countDias += 1;
          }
        }
      });
      const tempoMedioVendaDias = countDias > 0 ? totalDias / countDias : 0;
      const apresentacoesMediasPorVenda = countApresPorVenda > 0
        ? totalApresPorVenda / countApresPorVenda
        : 0;

      // Carteira flutuante: soma do valor estimado dos projetos em negociação ativos
      const carteiraFlutuanteValor = memberProjects
        .filter(p => (p.stage === 'em_negociacao' || p.stage === 'lead') && p.status !== 'perdido')
        .reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);

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
        tempoMedioVendaDias,
        apresentacoesMediasPorVenda,
        carteiraFlutuanteValor,
      };
    });
  }, [monthActions, actions, commercialMemberIds, teamMembers, actionTypeClassification, projects, year, month]);

  return {
    indicators,
    commercialMemberIds,
    isLoading: projectsLoading,
  };
}
