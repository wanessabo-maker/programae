import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the set of team_member IDs that hold the
 * "Consultor Comercial Engenharia" position (active positions only).
 * Used to split sales/metas of the Engenharia channel from the general totals.
 */
export function useEngenhariaMembers() {
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: positions, error: posErr } = await supabase
          .from('positions')
          .select('id, name, is_active')
          .ilike('name', '%engenharia%');
        if (posErr) throw posErr;
        const positionIds = (positions ?? [])
          .filter((p) => p.is_active && /consultor.*comercial.*engenharia/i.test(p.name))
          .map((p) => p.id);
        if (positionIds.length === 0) {
          if (!cancelled) setMemberIds(new Set());
          return;
        }
        const { data: tmps, error: tmpErr } = await supabase
          .from('team_member_positions')
          .select('team_member_id, position_id')
          .in('position_id', positionIds);
        if (tmpErr) throw tmpErr;
        if (!cancelled) {
          setMemberIds(new Set((tmps ?? []).map((t) => t.team_member_id as string)));
        }
      } catch (e) {
        console.error('useEngenhariaMembers error', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { memberIds, isLoading };
}