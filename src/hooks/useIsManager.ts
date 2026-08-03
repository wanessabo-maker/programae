import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { usePositions } from '@/hooks/usePositions';

/**
 * Permissão de acesso à área de Gestão:
 * admin OU colaborador com cargo de gerência/gerente.
 */
export function useIsManager() {
  const { isAdmin } = useAuthContext();
  const { data: currentTeamMember, isLoading } = useCurrentTeamMember();
  const { getMemberPositions } = usePositions();

  const isManagement = useMemo(() => {
    if (!currentTeamMember?.id) return false;
    return getMemberPositions(currentTeamMember.id).some(
      p => p.name.toLowerCase().includes('gerencia')
        || p.name.toLowerCase().includes('gerência')
        || p.name.toLowerCase().includes('gerente')
    );
  }, [currentTeamMember?.id, getMemberPositions]);

  return {
    isAdmin,
    isManagement,
    canAccessGestao: isAdmin || isManagement,
    isLoading,
  };
}