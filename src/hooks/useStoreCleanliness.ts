import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

// Returns the Monday (ISO) of the current week as 'YYYY-MM-DD'
export function getCurrentWeekStart(): string {
  const d = new Date();
  const dow = d.getDay() === 0 ? 7 : d.getDay(); // 1..7 (Mon=1)
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow - 1));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CleanlinessCheck {
  id: string;
  team_member_id: string;
  rating: number;
  notes: string | null;
  checked_at: string;
  week_start: string;
  team_member?: { id: string; name: string } | null;
}

// Current user's check for this week
export function useMyWeeklyCleanlinessCheck() {
  const { data: member } = useCurrentTeamMember();
  const weekStart = getCurrentWeekStart();

  return useQuery({
    queryKey: ['cleanliness-my-week', member?.id, weekStart],
    enabled: !!member?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_cleanliness_checks')
        .select('*')
        .eq('team_member_id', member!.id)
        .eq('week_start', weekStart)
        .maybeSingle();
      if (error) throw error;
      return data as CleanlinessCheck | null;
    },
  });
}

export function useSubmitCleanlinessCheck() {
  const queryClient = useQueryClient();
  const { data: member } = useCurrentTeamMember();
  const weekStart = getCurrentWeekStart();

  return useMutation({
    mutationFn: async (rating: number) => {
      if (!member?.id) throw new Error('Sem team member');
      const { error } = await supabase
        .from('store_cleanliness_checks')
        .upsert(
          {
            team_member_id: member.id,
            rating,
            week_start: weekStart,
            checked_at: new Date().toISOString(),
          },
          { onConflict: 'team_member_id,week_start' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanliness-my-week'] });
      queryClient.invalidateQueries({ queryKey: ['cleanliness-week-list'] });
    },
  });
}

// All checks for current week (admin view) with realtime
export function useWeeklyCleanlinessList() {
  const queryClient = useQueryClient();
  const weekStart = getCurrentWeekStart();

  const query = useQuery({
    queryKey: ['cleanliness-week-list', weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_cleanliness_checks')
        .select('id, team_member_id, rating, notes, checked_at, week_start, team_members(id, name)')
        .eq('week_start', weekStart)
        .order('checked_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        team_member: row.team_members,
      })) as CleanlinessCheck[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('cleanliness-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_cleanliness_checks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cleanliness-week-list'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
