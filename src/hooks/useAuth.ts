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
        // Fetch user roles and areas in parallel
        const [rolesResult, areasResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id),
          supabase
            .from('user_areas')
            .select('area')
            .eq('user_id', user.id),
        ]);
        
        if (!isMounted) return;
        
        const roles = (rolesResult.data?.map(r => r.role) as AppRole[]) || [];
        const isAdmin = roles.includes('admin');
        const userAreas = (areasResult.data?.map(a => a.area) as FunctionalArea[]) || [];
        
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

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
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
    
    const { data } = await supabase
      .from('user_areas')
      .select('area')
      .eq('user_id', authState.user.id);
    
    const userAreas = (data?.map(a => a.area) as FunctionalArea[]) || [];
    
    setAuthState(prev => ({
      ...prev,
      userAreas,
    }));
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    hasAreaAccess,
    refreshAreas,
  };
}
