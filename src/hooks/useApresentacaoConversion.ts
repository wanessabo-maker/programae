import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export interface ApresentacaoConversionData {
  projetistaId: string;
  projetistaName: string;
  apresentados: number;
  vendidos: number;
  perdidos: number;
  emNegociacao: number;
  taxaConversao: number;
  valorVendido: number;
  valorEstimado: number;
}

export function useApresentacaoConversion(year: number, month: number) {
  const { teamMembers } = useApp();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: projects, isLoading } = useQuery({
    queryKey: ['apresentacao-conversion', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, apresentacao_projetista_id, stage, estimated_value, closed_value, created_at, closed_date')
        .not('apresentacao_projetista_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  const conversionData = useMemo((): ApresentacaoConversionData[] => {
    if (!projects) return [];

    // Group by projetista
    const grouped: Record<string, typeof projects> = {};
    projects.forEach(p => {
      const pid = p.apresentacao_projetista_id!;
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(p);
    });

    return Object.entries(grouped)
      .map(([projetistaId, projs]) => {
        const member = teamMembers.find(m => m.id === projetistaId);
        // Filter: presented in this month (created_at) OR sold in this month (closed_date)
        const apresentadosNoMes = projs.filter(p => {
          const created = p.created_at ? p.created_at.substring(0, 7) : '';
          return created === `${year}-${String(month).padStart(2, '0')}`;
        });
        const vendidosNoMes = projs.filter(p => {
          return p.stage === 'closed_won' && p.closed_date &&
            p.closed_date >= startDate && p.closed_date <= endDate;
        });
        const perdidosNoMes = projs.filter(p => {
          return p.stage === 'closed_lost';
        });

        // Overall stats for this projetista (all time, for context)
        const totalApresentados = projs.length;
        const totalVendidos = projs.filter(p => p.stage === 'closed_won').length;
        const totalPerdidos = projs.filter(p => p.stage === 'closed_lost').length;
        const totalEmNegociacao = projs.filter(p => p.stage !== 'closed_won' && p.stage !== 'closed_lost').length;
        const taxaConversao = totalApresentados > 0 ? (totalVendidos / totalApresentados) * 100 : 0;
        const valorVendido = projs
          .filter(p => p.stage === 'closed_won')
          .reduce((s, p) => s + (p.closed_value || 0), 0);
        const valorEstimado = projs
          .reduce((s, p) => s + (p.estimated_value || 0), 0);

        return {
          projetistaId,
          projetistaName: member?.name || 'Sem nome',
          apresentados: totalApresentados,
          vendidos: totalVendidos,
          perdidos: totalPerdidos,
          emNegociacao: totalEmNegociacao,
          taxaConversao,
          valorVendido,
          valorEstimado,
        };
      })
      .filter(d => d.apresentados > 0)
      .sort((a, b) => b.taxaConversao - a.taxaConversao);
  }, [projects, teamMembers, year, month, startDate, endDate]);

  return { conversionData, isLoading };
}
