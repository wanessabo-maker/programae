import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useCurrentTeamMember() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['current_team_member', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        // No team member linked to this user - that's OK
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });
}
