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
  photos?: string[] | null;
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
    mutationFn: async (input: number | { rating: number; notes?: string | null; photos?: string[] }) => {
      if (!member?.id) throw new Error('Sem team member');
      const payload = typeof input === 'number' ? { rating: input } : input;
      const safe = Math.max(0, Math.min(5, Math.round(payload.rating * 10) / 10));
      const { error } = await supabase
        .from('store_cleanliness_checks')
        .upsert(
          {
            team_member_id: member.id,
            rating: safe,
            notes: payload.notes ?? null,
            photos: payload.photos ?? [],
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

// Update an existing rating (admin)
export function useUpdateCleanlinessCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: number }) => {
      const safe = Math.max(0, Math.min(5, Math.round(rating * 10) / 10));
      const { error } = await supabase
        .from('store_cleanliness_checks')
        .update({ rating: safe })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanliness-week-list'] });
      queryClient.invalidateQueries({ queryKey: ['cleanliness-month-list'] });
      queryClient.invalidateQueries({ queryKey: ['cleanliness-my-week'] });
    },
  });
}

// Delete a rating (admin)
export function useDeleteCleanlinessCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_cleanliness_checks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanliness-week-list'] });
      queryClient.invalidateQueries({ queryKey: ['cleanliness-month-list'] });
      queryClient.invalidateQueries({ queryKey: ['cleanliness-my-week'] });
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
        .select('id, team_member_id, rating, notes, photos, checked_at, week_start')
        .eq('week_start', weekStart)
        .order('checked_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const ids = Array.from(new Set(rows.map((r: any) => r.team_member_id).filter(Boolean)));
      let membersById: Record<string, { id: string; name: string }> = {};
      if (ids.length) {
        const { data: members, error: memErr } = await supabase
          .from('team_members')
          .select('id, name')
          .in('id', ids);
        if (memErr) throw memErr;
        membersById = Object.fromEntries((members || []).map((m: any) => [m.id, m]));
      }
      return rows.map((row: any) => ({
        ...row,
        team_member: membersById[row.team_member_id] || null,
      })) as CleanlinessCheck[];
    },
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const channelName = `cleanliness-realtime-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_cleanliness_checks' },
        (payload) => {
          console.log('[cleanliness] realtime event', payload);
          queryClient.invalidateQueries({ queryKey: ['cleanliness-week-list'] });
          queryClient.invalidateQueries({ queryKey: ['cleanliness-month-list'] });
          queryClient.invalidateQueries({ queryKey: ['cleanliness-my-week'] });
        }
      )
      .subscribe((status) => {
        console.log('[cleanliness] channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// All checks for current month (admin view)
export function useMonthlyCleanlinessList() {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

  return useQuery({
    queryKey: ['cleanliness-month-list', monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_cleanliness_checks')
        .select('id, rating, checked_at, week_start')
        .gte('checked_at', monthStart)
        .lt('checked_at', monthEnd);
      if (error) throw error;
      return data || [];
    },
  });
}
