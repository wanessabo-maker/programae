import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useProfessions() {
  const [professions, setProfessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProfessions = async () => {
      setIsLoading(true);
      try {
        // Fetch unique professions from clients table
        const { data, error } = await supabase
          .from('clients')
          .select('profession')
          .not('profession', 'is', null)
          .not('profession', 'eq', '');

        if (error) throw error;

        // Normalize and deduplicate professions (case-insensitive, trim whitespace)
        const uniqueProfessions = new Map<string, string>();
        
        data?.forEach((client) => {
          if (client.profession) {
            const normalized = client.profession.trim().toLowerCase();
            // Keep the first occurrence's original casing
            if (!uniqueProfessions.has(normalized)) {
              // Title case the profession for consistency
              const titleCased = client.profession.trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              uniqueProfessions.set(normalized, titleCased);
            }
          }
        });

        // Sort alphabetically
        const sortedProfessions = Array.from(uniqueProfessions.values()).sort((a, b) => 
          a.localeCompare(b, 'pt-BR')
        );

        setProfessions(sortedProfessions);
      } catch (err) {
        console.error('Error fetching professions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfessions();
  }, []);

  return { professions, isLoading };
}
