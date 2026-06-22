import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns sets of team_member IDs by sales channel position:
 *  - engMemberIds:  hold "Consultor Comercial Engenharia" position (active)
 *  - convMemberIds: hold generic "Consultor Comercial" position (active, NOT Engenharia)
 *  - dualMemberIds: hold BOTH positions (used to ask channel at sale time)
 *  - engOnlyMemberIds: only Engenharia (no generic Comercial)
 * Used to split sales/metas of the Engenharia channel from the general totals.
 */
export function useEngenhariaMembers() {
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [convMemberIds, setConvMemberIds] = useState<Set<string>>(new Set());
  const [dualMemberIds, setDualMemberIds] = useState<Set<string>>(new Set());
  const [engOnlyMemberIds, setEngOnlyMemberIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: positions, error: posErr } = await supabase
          .from('positions')
          .select('id, name, is_active')
          .ilike('name', '%consultor%comercial%');
        if (posErr) throw posErr;
        const active = (positions ?? []).filter((p) => p.is_active);
        const engPosIds = active
          .filter((p) => /consultor.*comercial.*engenharia/i.test(p.name))
          .map((p) => p.id);
        const convPosIds = active
          .filter((p) => /consultor.*comercial/i.test(p.name) && !/engenharia/i.test(p.name))
          .map((p) => p.id);
        const allPosIds = [...engPosIds, ...convPosIds];
        if (allPosIds.length === 0) {
          if (!cancelled) {
            setMemberIds(new Set()); setConvMemberIds(new Set());
            setDualMemberIds(new Set()); setEngOnlyMemberIds(new Set());
          }
          return;
        }
        const { data: tmps, error: tmpErr } = await supabase
          .from('team_member_positions')
          .select('team_member_id, position_id')
          .in('position_id', allPosIds);
        if (tmpErr) throw tmpErr;
        const engSet = new Set<string>();
        const convSet = new Set<string>();
        for (const t of tmps ?? []) {
          if (engPosIds.includes(t.position_id as string)) engSet.add(t.team_member_id as string);
          if (convPosIds.includes(t.position_id as string)) convSet.add(t.team_member_id as string);
        }
        const dual = new Set<string>();
        const engOnly = new Set<string>();
        engSet.forEach((id) => { if (convSet.has(id)) dual.add(id); else engOnly.add(id); });
        if (!cancelled) {
          setMemberIds(engSet);
          setConvMemberIds(convSet);
          setDualMemberIds(dual);
          setEngOnlyMemberIds(engOnly);
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

  /** Heurística: uma ação/meta deve contar como canal Engenharia? */
  const isEngenhariaConsultant = (
    consultantId: string | null | undefined,
    explicitChannel?: 'convencional' | 'engenharia' | null,
  ): boolean => {
    if (explicitChannel === 'engenharia') return true;
    if (explicitChannel === 'convencional') return false;
    if (!consultantId) return false;
    // Sem canal explícito: só conta como engenharia se o consultor é exclusivamente Engenharia
    return engOnlyMemberIds.has(consultantId);
  };

  return {
    memberIds,
    convMemberIds,
    dualMemberIds,
    engOnlyMemberIds,
    isEngenhariaConsultant,
    isLoading,
  };
}