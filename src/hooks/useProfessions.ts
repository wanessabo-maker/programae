import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dedupeProfessions } from '@/lib/professions';

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

        // Normaliza gênero/plural e deduplica (Médico/Médica/Médicos -> Médico (a))
        setProfessions(dedupeProfessions((data ?? []).map(c => c.profession)));
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
