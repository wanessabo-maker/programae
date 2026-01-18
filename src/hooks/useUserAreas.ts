import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type FunctionalArea = Database['public']['Enums']['functional_area'];

// Areas that are always accessible to all users
export const PUBLIC_AREAS = ['dashboard', 'programa_e_mais'] as const;

// Mapping between route paths and functional areas
export const ROUTE_AREA_MAP: Record<string, FunctionalArea | null> = {
  '/': null, // Dashboard - always accessible
  '/comercial': 'comercial',
  '/projetos': 'projetos',
  '/customer-success': 'customer_success',
  '/programa-e-mais': null, // Programa E+ - always accessible
  '/usuarios': null, // Admin only, handled separately
};

// Mapping functional areas to display labels
export const AREA_LABELS: Record<FunctionalArea, string> = {
  comercial: 'Comercial',
  projetos: 'Projetos',
  customer_success: 'CS & AT',
  assistencia_tecnica: 'Assistência Técnica',
};

// All configurable areas (excluding public ones)
export const CONFIGURABLE_AREAS: FunctionalArea[] = [
  'comercial',
  'projetos',
  'customer_success',
  'assistencia_tecnica',
];

export function useUserAreas(userId: string | null) {
  const [areas, setAreas] = useState<FunctionalArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setAreas([]);
      setIsLoading(false);
      return;
    }

    const fetchAreas = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_areas')
          .select('area')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching user areas:', error);
          setAreas([]);
        } else {
          setAreas(data?.map(row => row.area) || []);
        }
      } catch (error) {
        console.error('Error fetching user areas:', error);
        setAreas([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAreas();
  }, [userId]);

  const hasAccess = (area: FunctionalArea): boolean => {
    return areas.includes(area);
  };

  const canAccessRoute = (path: string, isAdmin: boolean): boolean => {
    // Admins can access everything
    if (isAdmin) return true;

    const requiredArea = ROUTE_AREA_MAP[path];
    
    // Public routes (dashboard, programa E+)
    if (requiredArea === null) {
      // Special case: /usuarios is admin only
      if (path === '/usuarios') return false;
      return true;
    }

    return hasAccess(requiredArea);
  };

  return {
    areas,
    isLoading,
    hasAccess,
    canAccessRoute,
  };
}
