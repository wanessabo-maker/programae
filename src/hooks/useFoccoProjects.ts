import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FoccoProject {
  foccoNumber: string;
  projectName: string;
  clientName?: string;
  stage: string;
}

interface UseFoccoProjectsOptions {
  filterByStage?: 'em_negociacao' | 'closed_won' | 'closed_lost' | null;
}

export function useFoccoProjects(options: UseFoccoProjectsOptions = {}) {
  const { filterByStage = null } = options;
  const [foccoProjects, setFoccoProjects] = useState<FoccoProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFoccoProjects = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('projects')
          .select(`
            focco_project_number,
            name,
            stage,
            clients:client_id (name)
          `)
          .not('focco_project_number', 'is', null)
          .not('focco_project_number', 'eq', '');

        // Apply stage filter if specified
        if (filterByStage) {
          query = query.eq('stage', filterByStage);
        }

        const { data, error } = await query.order('focco_project_number', { ascending: false });

        if (error) throw error;

        const projects: FoccoProject[] = (data || []).map((project: any) => ({
          foccoNumber: project.focco_project_number,
          projectName: project.name,
          clientName: project.clients?.name || undefined,
          stage: project.stage,
        }));

        setFoccoProjects(projects);
      } catch (err) {
        console.error('Error fetching FOCCO projects:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFoccoProjects();
  }, [filterByStage]);

  return { foccoProjects, isLoading };
}
