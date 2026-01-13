import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'user';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  roles: AppRole[];
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAdmin: false,
    roles: [],
  });

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null;
        
        if (user) {
          // Fetch user roles
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          const roles = (rolesData?.map(r => r.role) as AppRole[]) || [];
          const isAdmin = roles.includes('admin');
          
          setAuthState({
            user,
            session,
            isLoading: false,
            isAdmin,
            roles,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAdmin: false,
            roles: [],
          });
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
      // If session exists, onAuthStateChange will handle it
    });

    return () => {
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

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  };
}
