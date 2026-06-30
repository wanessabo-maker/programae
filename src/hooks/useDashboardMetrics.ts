/**
 * useDashboardMetrics
 *
 * FASE 2: Lógica de cálculo de métricas extraída do Dashboard.tsx (que tinha 861 linhas).
 * Antes: cálculos de metas mensais, métricas por consultor e agrupamento por área
 *        todos misturados no corpo do componente, re-calculados a cada render.
 * Agora: lógica isolada e memoizada neste hook, Dashboard.tsx apenas renderiza.
 */

import { useMemo } from 'react';
import { isThisMonth, parseISO } from 'date-fns';
import { useApp } from '@/contexts/AppContext';
import { usePositions } from '@/hooks/usePositions';
import { useMonthlyEnvironmentStats } from '@/hooks/useProjectEnvironments';

const PROJETOS_AREA_ID = 'aad0d175-cabd-490d-ae7d-53b97dc8edc4';

export function useDashboardMetrics() {
  const {
    actions, metas, areas, teamMembers, actionTypes,
    professionals, professionalCategories,
  } = useApp();
  const { getMemberAreaIds, getAreaName } = usePositions();

  const currentDate = new Date();
  const { data: envStats } = useMonthlyEnvironmentStats(currentDate.getFullYear(), currentDate.getMonth() + 1);

  const activeMembers = useMemo(() => teamMembers.filter(m => m.active), [teamMembers]);

  // Metas ativas (dentro do período de validade)
  // Comparar por data calendário (YYYY-MM-DD) para evitar bug de timezone:
  // "2026-06-30" parseado como UTC vira 29/06 21:00 BRT e era considerado < hoje.
  const activeMetas = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return metas.filter(m => {
      if (!m.isActive) return false;
      if (m.endDate && m.endDate.slice(0, 10) < todayStr) return false;
      if (m.startDate && m.startDate.slice(0, 10) > todayStr) return false;
      return true;
    });
  }, [metas]);

  // Ações do mês corrente (evita refiltragem em cada métrica)
  const thisMonthActions = useMemo(
    () => actions.filter(a => isThisMonth(parseISO(a.date))),
    [actions]
  );

  // Métricas gerais do mês (KPIs do topo do Dashboard)
  const monthlyMetrics = useMemo(() => {
    const totalSales = thisMonthActions
      .filter(a => actionTypes.find(t => t.id === a.actionTypeId)?.classification === 'venda')
      .reduce((sum, a) => sum + (a.value || 0), 0);

    const totalCaptacoes = thisMonthActions.filter(a =>
      actionTypes.find(t => t.id === a.actionTypeId)?.impactsMetas.includes('captacao')
    ).length;

    const membersWithIndividualAcoesMeta = activeMetas.filter(m => m.type === 'acoes' && m.teamMemberId).map(m => m.teamMemberId);
    const areasWithAcoesMeta = activeMetas.filter(m => m.type === 'acoes' && !m.teamMemberId).map(m => m.areaId);
    const membersWithAcoesMeta = activeMembers
      .filter(m => {
        if (membersWithIndividualAcoesMeta.includes(m.id)) return true;
        const memberAreaIds = getMemberAreaIds(m.id);
        return memberAreaIds.some(aid => areasWithAcoesMeta.includes(aid)) || areasWithAcoesMeta.includes(m.areaId);
      })
      .map(m => m.id);

    const totalAcoes = thisMonthActions.filter(a => membersWithAcoesMeta.includes(a.consultantId)).length;

    const salesMeta = activeMetas.filter(m => m.type === 'vendas').reduce((s, m) => s + m.value, 0);
    const captacaoMeta = activeMetas.filter(m => m.type === 'captacao').reduce((s, m) => s + m.value, 0);
    const acoesMeta = activeMetas.filter(m => m.type === 'acoes').reduce((s, m) => s + m.value, 0);

    return {
      sales: { value: totalSales, meta: salesMeta, percentage: salesMeta > 0 ? (totalSales / salesMeta) * 100 : 0 },
      captacoes: { value: totalCaptacoes, meta: captacaoMeta, percentage: captacaoMeta > 0 ? (totalCaptacoes / captacaoMeta) * 100 : 0 },
      acoes: { value: totalAcoes, meta: acoesMeta, percentage: acoesMeta > 0 ? (totalAcoes / acoesMeta) * 100 : 0 },
    };
  }, [thisMonthActions, activeMetas, actionTypes, activeMembers, getMemberAreaIds]);

  // Métricas individuais por consultor
  const consultantMetrics = useMemo(() => {
    return activeMembers.map(member => {
      const memberAreaIds = getMemberAreaIds(member.id);
      const primaryAreaId = memberAreaIds[0] || member.areaId;
      const primaryAreaName = primaryAreaId ? getAreaName(primaryAreaId) : '';
      const isProjectsArea = memberAreaIds.includes(PROJETOS_AREA_ID) || primaryAreaId === PROJETOS_AREA_ID;

      const memberActions = thisMonthActions.filter(a => a.consultantId === member.id);
      const totalSales = memberActions
        .filter(a => actionTypes.find(t => t.id === a.actionTypeId)?.classification === 'venda')
        .reduce((s, a) => s + (a.value || 0), 0);
      const totalAcoes = memberActions.length;

      const memberProfessionals = professionals.filter(p => p.consultantId === member.id);
      const categoryOrder = ['ENCANTADO', 'CURIOSO', 'DISTANTE'];
      const categoryBreakdown = professionalCategories
        .map(cat => ({ name: cat.name, count: memberProfessionals.filter(p => p.categoryId === cat.id).length }))
        .sort((a, b) => {
          const ai = categoryOrder.indexOf(a.name.toUpperCase());
          const bi = categoryOrder.indexOf(b.name.toUpperCase());
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return 0;
        });

      const memberMetas = activeMetas.filter(m => m.teamMemberId === member.id);
      const areaMetas = memberMetas.length > 0
        ? memberMetas
        : activeMetas.filter(m => m.areaId === member.areaId && !m.teamMemberId);

      const metricsForArea: Array<{
        type: string; label: string; value: number | string; meta: number;
        percentage: number; isCurrency?: boolean; isCategory?: boolean; isPrimary?: boolean; order?: number;
        isMaxLimit?: boolean; onTarget?: boolean;
        categoryMin?: number; categoryMax?: number;
      }> = [];

      areaMetas.filter(meta => meta.value > 1).forEach(meta => {
        const v = meta.value;
        if (meta.type === 'vendas') {
          const percentage = v > 0 ? (totalSales / v) * 100 : 0;
          metricsForArea.push({ type: 'vendas', label: 'VENDAS', value: totalSales, meta: v, percentage, isCurrency: true, isPrimary: true, order: 1, onTarget: totalSales >= v });
        } else if (meta.type === 'captacao') {
          const total = memberActions.filter(a => actionTypes.find(t => t.id === a.actionTypeId)?.impactsMetas.includes('captacao')).length;
          const percentage = v > 0 ? (total / v) * 100 : 0;
          metricsForArea.push({ type: 'captacao', label: 'CAPTAÇÃO', value: total, meta: v, percentage, isPrimary: true, order: 2, onTarget: total >= v });
        } else if (meta.type === 'acoes') {
          const percentage = v > 0 ? (totalAcoes / v) * 100 : 0;
          metricsForArea.push({ type: 'acoes', label: 'AÇÕES', value: totalAcoes, meta: v, percentage, isPrimary: true, order: 3, onTarget: totalAcoes >= v });
        } else if (meta.type === 'projeto') {
          const memberEnvStats = envStats?.byProjetista?.[member.id];
          const totalAmbientes = memberEnvStats ? (memberEnvStats.apresentacao || 0) + (memberEnvStats.tecnico || 0) : 0;
          const percentage = v > 0 ? (totalAmbientes / v) * 100 : 0;
          metricsForArea.push({ type: 'projeto', label: 'AMBIENTES', value: totalAmbientes, meta: v, percentage, isPrimary: false, order: 4, onTarget: totalAmbientes >= v });
        } else if (meta.type === 'categoria' && meta.categoryId) {
          const catCount = memberProfessionals.filter(p => p.categoryId === meta.categoryId).length;
          const pct = memberProfessionals.length > 0 ? (catCount / memberProfessionals.length) * 100 : 0;
          const category = professionalCategories.find(c => c.id === meta.categoryId);
          
          let effectiveMeta = v;
          let effectivePercentage = v > 0 ? (pct / v) * 100 : 0;
          let isMaxLimit = false;
          
          const hasMin = category?.minPercentage !== undefined && category.minPercentage > 0;
          const hasMax = category?.maxPercentage !== undefined && category.maxPercentage > 0;
          
          if (hasMin && hasMax) {
            effectiveMeta = category.maxPercentage;
            isMaxLimit = true;
            effectivePercentage = category.maxPercentage > 0 ? (pct / category.maxPercentage) * 100 : 0;
          } else if (hasMin) {
            effectiveMeta = category.minPercentage;
            effectivePercentage = category.minPercentage > 0 ? (pct / category.minPercentage) * 100 : 0;
          } else if (hasMax) {
            effectiveMeta = category.maxPercentage;
            isMaxLimit = true;
            effectivePercentage = pct > 0 && category.maxPercentage > 0
              ? (category.maxPercentage / pct) * 100
              : 100;
          }
          
          let onTarget: boolean;
          if (hasMin && hasMax) {
            onTarget = pct >= category.minPercentage && pct <= category.maxPercentage;
          } else {
            onTarget = isMaxLimit ? pct <= effectiveMeta : pct >= effectiveMeta;
          }
          
          metricsForArea.push({
            type: `categoria-${meta.categoryId}`,
            label: `% ${category?.name?.toUpperCase() || 'CATEGORIA'}`,
            value: `${pct.toFixed(0)}%`,
            meta: effectiveMeta,
            percentage: effectivePercentage,
            isCategory: true,
            isMaxLimit,
            isPrimary: false,
            order: 10,
            onTarget,
            categoryMin: category?.minPercentage,
            categoryMax: category?.maxPercentage,
          });
        }
      });

      metricsForArea.sort((a, b) => (a.order || 99) - (b.order || 99));

      return {
        id: member.id, name: member.name, areaId: primaryAreaId, areaName: primaryAreaName,
        isProjectsArea, metricsForArea, categoryBreakdown,
        totalProfessionals: memberProfessionals.length,
        actionCount: totalAcoes,
        hasActions: totalAcoes > 0,
      };
    });
  }, [activeMembers, thisMonthActions, activeMetas, actionTypes, professionals, professionalCategories, getMemberAreaIds, getAreaName, envStats]);

  // Agrupamento por área para renderização
  const consultantsByArea = useMemo(() => {
    const grouped: Record<string, typeof consultantMetrics> = {};
    consultantMetrics
      .filter(c => c.metricsForArea.length > 0 || c.hasActions)
      .forEach(c => {
        const key = c.areaName || 'Sem Área';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
      });
    return grouped;
  }, [consultantMetrics]);

  return { monthlyMetrics, consultantMetrics, consultantsByArea, activeMetas, thisMonthActions };
}
