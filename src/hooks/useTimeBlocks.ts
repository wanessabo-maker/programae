import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BlockPeriod = 'manha' | 'tarde';
export type BlockType = 'atividade_fim' | 'operacional';
export type ActivityKind = 'prospeccao' | 'relacionamento' | 'apresentacao' | 'fechamento';

export interface DailyTimeBlock {
  id: string;
  team_member_id: string;
  block_date: string;
  period: BlockPeriod;
  block_type: BlockType;
  activity_kind: ActivityKind | null;
}

/** Blocos de tempo do colaborador dentro de um intervalo (YYYY-MM-DD). */
export function useMyTimeBlocks(teamMemberId?: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ['daily_time_blocks', teamMemberId, from, to],
    enabled: !!teamMemberId && !!from && !!to,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_time_blocks')
        .select('*')
        .eq('team_member_id', teamMemberId as string)
        .gte('block_date', from as string)
        .lte('block_date', to as string)
        .order('block_date');
      if (error) throw error;
      return (data || []) as unknown as DailyTimeBlock[];
    },
  });
}

/** Marca (ou remarca) um bloco do dia — check-in de 1 clique. */
export function useUpsertTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      team_member_id: string;
      block_date: string;
      period: BlockPeriod;
      block_type: BlockType;
      activity_kind?: ActivityKind | null;
    }) => {
      const { data, error } = await supabase
        .from('daily_time_blocks')
        .upsert(
          { ...input, activity_kind: input.activity_kind ?? null },
          { onConflict: 'team_member_id,block_date,period' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily_time_blocks'] }),
    onError: (e: unknown) => toast.error(`Erro ao registrar check-in: ${(e as Error).message}`),
  });
}