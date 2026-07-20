import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RoleMember = { id: string; name: string };

async function fetchMembersByPositionMatch(regex: RegExp): Promise<RoleMember[]> {
  const { data: positions } = await supabase
    .from('positions')
    .select('id, name')
    .eq('is_active', true);
  const posIds = (positions ?? []).filter((p) => regex.test(p.name)).map((p) => p.id);
  if (!posIds.length) return [];
  const { data: mp } = await supabase
    .from('team_member_positions')
    .select('team_member_id')
    .in('position_id', posIds);
  const ids = [...new Set((mp ?? []).map((m) => m.team_member_id as string))];
  if (!ids.length) return [];
  const { data: mems } = await supabase
    .from('team_members')
    .select('id, name')
    .in('id', ids)
    .eq('active', true)
    .order('name');
  return (mems ?? []) as RoleMember[];
}

/** Members holding the "Projetista de Apresentação" position (active). */
export function useApresentacaoProjetistas() {
  return useQuery({
    queryKey: ['role-members', 'projetista-apresentacao'],
    queryFn: () => fetchMembersByPositionMatch(/projetista.*apresenta[cç][aã]o/i),
  });
}

/** Members holding any Comercial consultant position (Consultor Comercial or Engenharia). */
export function useComercialConsultores() {
  return useQuery({
    queryKey: ['role-members', 'consultor-comercial'],
    queryFn: () => fetchMembersByPositionMatch(/consultor.*comercial/i),
  });
}