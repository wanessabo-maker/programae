import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all unique professions from clients table
 * Used for autocomplete suggestions to prevent duplicates
 */
export function useUniqueProfessions() {
  return useQuery({
    queryKey: ['unique-professions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('profession')
        .not('profession', 'is', null)
        .neq('profession', '');
      
      if (error) throw error;
      
      // Extract unique professions and normalize them
      const professions = data
        .map(c => c.profession?.trim())
        .filter((p): p is string => !!p);
      
      // Get unique professions (case-insensitive comparison)
      const uniqueMap = new Map<string, string>();
      professions.forEach(p => {
        const key = p.toLowerCase();
        // Keep the first occurrence (usually more properly formatted)
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, p);
        }
      });
      
      // Return sorted array
      return Array.from(uniqueMap.values()).sort((a, b) => 
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
