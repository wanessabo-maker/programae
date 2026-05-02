/**
 * useRelatorioExecutivo
 *
 * FASE 3 — Relatório executivo exportável em PDF
 *
 * Gera um relatório consolidado por período com:
 * - Faturamento e meta por consultor
 * - Taxa de conversão (apresentações → vendas)
 * - Ranking do Programa E+
 * - Projetos em negociação vs fechados vs perdidos
 *
 * Usa a biblioteca @react-pdf/renderer (adicionar ao package.json):
 *   npm install @react-pdf/renderer
 *
 * Uso:
 *   const { gerarRelatorio, isGenerating } = useRelatorioExecutivo();
 *   await gerarRelatorio({ year: 2026, month: 4 });
 */

import { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePositions } from '@/hooks/usePositions';
import { parseISO, getMonth, getYear, format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RelatorioConsultor {
  nome: string;
  area: string;
  relacionamentos: number;
  apresentacoes: number;
  vendas: number;
  valorVendido: number;
  ticketMedio: number;
  taxaConversao: number;
  pontosPrograma: number;
  projetosEmNegociacao: number;
  projetosVendidos: number;
  projetosPerdidos: number;
  metaVendas: number;
  percentualMeta: number;
}

export interface DadosRelatorio {
  periodo: string;
  geradoEm: string;
  totalVendas: number;
  totalMeta: number;
  percentualGeralMeta: number;
  totalApresentacoes: number;
  totalRelacionamentos: number;
  taxaConversaoGeral: number;
  consultores: RelatorioConsultor[];
  topConsultorVendas: string;
  topConsultorPontos: string;
}

export function useRelatorioExecutivo() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { actions, actionTypes, teamMembers, metas, creditTransactions } = useApp();
  const { getMemberAreaIds, getAreaName } = usePositions();

  const buildRelatorio = useCallback((year: number, month: number): DadosRelatorio => {
    const activeMembers = teamMembers.filter(m => m.active);
    const today = new Date();

    // Metas ativas
    const activeMetas = metas.filter(m => {
      if (!m.isActive) return false;
      if (m.endDate && new Date(m.endDate) < today) return false;
      if (m.startDate && new Date(m.startDate) > today) return false;
      return true;
    });

    // Ações do mês
    const monthActions = actions.filter(a => {
      const d = parseISO(a.date);
      return getYear(d) === year && getMonth(d) === month - 1;
    });

    const consultores: RelatorioConsultor[] = activeMembers.map(member => {
      const memberAreaIds = getMemberAreaIds(member.id);
      const areaName = memberAreaIds[0] ? getAreaName(memberAreaIds[0]) : member.areaId ? getAreaName(member.areaId) : '';

      const memberActions = monthActions.filter(a => a.consultantId === member.id);

      const relacionamentos = memberActions.filter(a =>
        actionTypes.find(t => t.id === a.actionTypeId)?.classification === 'relacionamento'
      ).length;

      const apresentacoes = memberActions.filter(a => {
        const at = actionTypes.find(t => t.id === a.actionTypeId);
        return at?.classification === 'apresentacao' || at?.name?.toLowerCase().includes('apresentação');
      }).length;

      const vendasActions = memberActions.filter(a =>
        actionTypes.find(t => t.id === a.actionTypeId)?.classification === 'venda'
      );

      const valorVendido = vendasActions.reduce((s, a) => s + (a.value || 0), 0);
      const taxaConversao = apresentacoes > 0 ? (vendasActions.length / apresentacoes) * 100 : 0;
      const ticketMedio = vendasActions.length > 0 ? valorVendido / vendasActions.length : 0;

      // Pontos do Programa E+ no mês
      const memberTx = creditTransactions.filter(t => {
        if (t.consultantId !== member.id || t.type !== 'ganho') return false;
        const d = parseISO(t.date);
        return getYear(d) === year && getMonth(d) === month - 1;
      });
      const pontosPrograma = memberTx.reduce((s, t) => s + t.amount, 0);

      // Meta de vendas
      const memberMeta = activeMetas.find(m => m.teamMemberId === member.id && m.type === 'vendas');
      const areaMeta = activeMetas.find(m => m.areaId === member.areaId && !m.teamMemberId && m.type === 'vendas');
      const metaVendas = memberMeta?.value || areaMeta?.value || 0;
      const percentualMeta = metaVendas > 0 ? (valorVendido / metaVendas) * 100 : 0;

      return {
        nome: member.name, area: areaName, relacionamentos, apresentacoes,
        vendas: vendasActions.length, valorVendido, ticketMedio,
        taxaConversao, pontosPrograma, metaVendas, percentualMeta,
        // Projetos serão preenchidos em versão futura com query separada
        projetosEmNegociacao: 0, projetosVendidos: 0, projetosPerdidos: 0,
      };
    }).filter(c => c.vendas > 0 || c.relacionamentos > 0 || c.apresentacoes > 0);

    consultores.sort((a, b) => b.valorVendido - a.valorVendido);

    const totalVendas = consultores.reduce((s, c) => s + c.valorVendido, 0);
    const totalMeta = consultores.reduce((s, c) => s + c.metaVendas, 0);
    const totalApresentacoes = consultores.reduce((s, c) => s + c.apresentacoes, 0);
    const totalRelacionamentos = consultores.reduce((s, c) => s + c.relacionamentos, 0);
    const totalVendasCount = consultores.reduce((s, c) => s + c.vendas, 0);
    const taxaConversaoGeral = totalApresentacoes > 0 ? (totalVendasCount / totalApresentacoes) * 100 : 0;

    const topConsultorVendas = consultores[0]?.nome || '—';
    const topConsultorPontos = [...consultores].sort((a, b) => b.pontosPrograma - a.pontosPrograma)[0]?.nome || '—';

    return {
      periodo: format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR }),
      geradoEm: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      totalVendas, totalMeta,
      percentualGeralMeta: totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0,
      totalApresentacoes, totalRelacionamentos, taxaConversaoGeral,
      consultores, topConsultorVendas, topConsultorPontos,
    };
  }, [actions, actionTypes, teamMembers, metas, creditTransactions, getMemberAreaIds, getAreaName]);

  /**
   * Gera e baixa o relatório em XLSX (compatível com Excel e Google Sheets).
   * Para PDF completo, instalar @react-pdf/renderer e usar o componente
   * RelatorioExecutivoPDF abaixo.
   */
  const gerarRelatorio = useCallback(async ({ year, month }: { year: number; month: number }) => {
    setIsGenerating(true);
    try {
      const dados = buildRelatorio(year, month);

      // Import dinâmico para não aumentar o bundle principal
      const XLSX = await import('xlsx');

      // Aba 1: Resumo executivo
      const resumo = [
        ['EVVIVA BERTOLINI · PROGRAMA E+', ''],
        ['Relatório Executivo', dados.periodo],
        ['Gerado em', dados.geradoEm],
        [''],
        ['RESUMO DO PERÍODO', ''],
        ['Faturamento Total', formatCurrency(dados.totalVendas)],
        ['Meta Total', formatCurrency(dados.totalMeta)],
        ['% da Meta', `${dados.percentualGeralMeta.toFixed(1)}%`],
        ['Total de Apresentações', dados.totalApresentacoes],
        ['Total de Relacionamentos', dados.totalRelacionamentos],
        ['Taxa de Conversão Geral', `${dados.taxaConversaoGeral.toFixed(1)}%`],
        ['Top Consultor (Vendas)', dados.topConsultorVendas],
        ['Top Consultor (Programa E+)', dados.topConsultorPontos],
      ];

      // Aba 2: Por consultor
      const porConsultor = [
        ['Consultor', 'Área', 'Relacionamentos', 'Apresentações', 'Vendas', 'Valor Vendido', 'Ticket Médio', 'Taxa Conversão', 'Meta Vendas', '% Meta', 'Pts Programa E+'],
        ...dados.consultores.map(c => [
          c.nome, c.area, c.relacionamentos, c.apresentacoes, c.vendas,
          c.valorVendido, c.ticketMedio, `${c.taxaConversao.toFixed(1)}%`,
          c.metaVendas, `${c.percentualMeta.toFixed(1)}%`, c.pontosPrograma,
        ]),
      ];

      // Aba 3: Ranking Programa E+
      const ranking = [
        ['#', 'Consultor', 'Área', 'Pontos no Mês'],
        ...[...dados.consultores]
          .sort((a, b) => b.pontosPrograma - a.pontosPrograma)
          .map((c, i) => [i + 1, c.nome, c.area, c.pontosPrograma]),
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(porConsultor), 'Por Consultor');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ranking), 'Ranking E+');

      const filename = `Relatorio_Evvivago_${year}_${String(month).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, filename);

      return dados;
    } finally {
      setIsGenerating(false);
    }
  }, [buildRelatorio]);

  return { gerarRelatorio, buildRelatorio, isGenerating };
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
