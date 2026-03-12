import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, User, Building2, Ruler } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjetistaTecnicoProjectsProps {
  teamMemberId: string;
}

interface TecnicoProject {
  projectId: string;
  projectName: string;
  clientName: string | null;
  foccoNumber: string | null;
  contractNumber: string | null;
  totalEnvironments: number;
}

function useProjetistaTecnicoProjects(teamMemberId: string) {
  return useQuery({
    queryKey: ['projetista-tecnico-projects', teamMemberId],
    queryFn: async () => {
      // Fetch project_environments where this user is the projetista and type is 'tecnico'
      const { data: envData, error: envError } = await supabase
        .from('project_environments')
        .select(`
          project_id,
          environment_count,
          project:projects(
            id,
            name,
            focco_project_number,
            clients(name, contract_number)
          )
        `)
        .eq('projetista_id', teamMemberId)
        .eq('environment_type', 'tecnico')
        .not('project_id', 'is', null);

      if (envError) throw envError;

      // Also fetch projects where this user is assigned as projetista in contract_checklists
      const { data: checklistData, error: checklistError } = await supabase
        .from('contract_checklists')
        .select(`
          project_id,
          project:projects(
            id,
            name,
            focco_project_number,
            clients:client_id(name, contract_number)
          )
        `)
        .eq('assigned_projetista_id', teamMemberId);

      if (checklistError) throw checklistError;

      // Merge both sources into unique projects
      const projectMap = new Map<string, TecnicoProject>();

      // From project_environments
      (envData || []).forEach((env: any) => {
        const projectId = env.project_id;
        if (!projectId || !env.project) return;

        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            projectId,
            projectName: env.project.name,
            clientName: env.project.clients?.name || null,
            foccoNumber: env.project.focco_project_number || null,
            contractNumber: env.project.clients?.contract_number || null,
            totalEnvironments: 0,
          });
        }
        projectMap.get(projectId)!.totalEnvironments += env.environment_count || 0;
      });

      // From contract_checklists (projects where assigned as projetista técnico)
      (checklistData || []).forEach((cl: any) => {
        const projectId = cl.project_id;
        if (!projectId || !cl.project) return;

        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            projectId,
            projectName: cl.project.name,
            clientName: cl.project.clients?.name || null,
            foccoNumber: cl.project.focco_project_number || null,
            contractNumber: cl.project.clients?.contract_number || null,
            totalEnvironments: 0,
          });
        }
      });

      return Array.from(projectMap.values());
    },
    enabled: !!teamMemberId,
  });
}

export function ProjetistaTecnicoProjects({ teamMemberId }: ProjetistaTecnicoProjectsProps) {
  const { data: projects, isLoading } = useProjetistaTecnicoProjects(teamMemberId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          Meus Projetos Técnicos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-border">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-1" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
        <Ruler className="h-4 w-4" />
        Meus Projetos Técnicos ({projects.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card 
            key={project.projectId} 
            className="border-2 border-black/10 shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3 pb-3 border-b border-black/10">
                <div className="flex-1 min-w-0">
                  {project.clientName && (
                    <p className="text-base font-bold truncate flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0 text-foreground/70" />
                      {project.clientName}
                    </p>
                  )}
                  {project.foccoNumber && (
                    <p className="text-xs font-bold flex items-center gap-2 mt-1">
                      <FileText className="h-3 w-3 shrink-0" />
                      FOCCO {project.foccoNumber}
                    </p>
                  )}
                  {project.contractNumber && (
                    <p className="text-xs font-bold flex items-center gap-2 mt-1">
                      <Building2 className="h-3 w-3 shrink-0" />
                      Contrato {project.contractNumber}
                    </p>
                  )}
                  {!project.clientName && !project.foccoNumber && !project.contractNumber && (
                    <p className="text-sm text-muted-foreground truncate">
                      {project.projectName}
                    </p>
                  )}
                </div>
                {project.totalEnvironments > 0 && (
                  <Badge variant="outline" className="shrink-0 text-xs font-bold">
                    {project.totalEnvironments} amb.
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
