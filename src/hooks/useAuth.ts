import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

export type AppRole = 'admin' | 'user';
export type FunctionalArea = Database['public']['Enums']['functional_area'];

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  roles: AppRole[];
  userAreas: FunctionalArea[];
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAdmin: false,
    roles: [],
    userAreas: [],
  });

  useEffect(() => {
    let isMounted = true;

    const fetchRolesAndAreasAndUpdateState = async (session: Session | null) => {
      if (!isMounted) return;
      
      const user = session?.user ?? null;
      
      if (user) {
        // Fetch user roles
        const rolesResult = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (!isMounted) return;
        
        const roles = (rolesResult.data?.map(r => r.role) as AppRole[]) || [];
        const isAdmin = roles.includes('admin');

        // Fetch user areas from the new position-based system
        // First get team_member linked to this user
        const teamMemberResult = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        let userAreas: FunctionalArea[] = [];
        
        if (teamMemberResult.data) {
          // Get positions assigned to this team member
          const positionsResult = await supabase
            .from('team_member_positions')
            .select(`
              position_id,
              positions!inner(area, is_active)
            `)
            .eq('team_member_id', teamMemberResult.data.id);
          
          if (positionsResult.data) {
            // Extract unique areas from active positions
            const areas = positionsResult.data
              .filter((p: any) => p.positions?.is_active)
              .map((p: any) => p.positions?.area)
              .filter(Boolean);
            userAreas = [...new Set(areas)] as FunctionalArea[];
          }
        }

        // Fallback: check old user_areas table for backwards compatibility
        if (userAreas.length === 0) {
          const areasResult = await supabase
            .from('user_areas')
            .select('area')
            .eq('user_id', user.id);
          
          userAreas = (areasResult.data?.map(a => a.area) as FunctionalArea[]) || [];
        }
        
        if (!isMounted) return;
        
        setAuthState({
          user,
          session,
          isLoading: false,
          isAdmin,
          roles,
          userAreas,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          isAdmin: false,
          roles: [],
          userAreas: [],
        });
      }
    };

    // Check initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchRolesAndAreasAndUpdateState(session);
    });

    // Set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only handle actual auth changes, not initial events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          fetchRolesAndAreasAndUpdateState(session);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const hasAreaAccess = (area: FunctionalArea): boolean => {
    // Admins have access to all areas
    if (authState.isAdmin) return true;
    return authState.userAreas.includes(area);
  };

  const refreshAreas = async () => {
    if (!authState.user) return;
    
    // First get team_member linked to this user
    const teamMemberResult = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', authState.user.id)
      .single();
    
    let userAreas: FunctionalArea[] = [];
    
    if (teamMemberResult.data) {
      // Get positions assigned to this team member
      const positionsResult = await supabase
        .from('team_member_positions')
        .select(`
          position_id,
          positions!inner(area, is_active)
        `)
        .eq('team_member_id', teamMemberResult.data.id);
      
      if (positionsResult.data) {
        const areas = positionsResult.data
          .filter((p: any) => p.positions?.is_active)
          .map((p: any) => p.positions?.area)
          .filter(Boolean);
        userAreas = [...new Set(areas)] as FunctionalArea[];
      }
    }

    // Fallback to old system
    if (userAreas.length === 0) {
      const areasResult = await supabase
        .from('user_areas')
        .select('area')
        .eq('user_id', authState.user.id);
      
      userAreas = (areasResult.data?.map(a => a.area) as FunctionalArea[]) || [];
    }
    
    setAuthState(prev => ({
      ...prev,
      userAreas,
    }));
  };

  return {
    ...authState,
    signIn,
    signOut,
    hasAreaAccess,
    refreshAreas,
  };
}
