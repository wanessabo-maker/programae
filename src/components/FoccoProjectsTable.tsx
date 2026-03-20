import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';
import { FileText, User, Ruler, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface FoccoRow {
  foccoNumber: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  stage: string | null;
  consultorComercial: string | null;
  projetista: string | null;
  totalAmbientes: number;
}

export function FoccoProjectsTable() {
  const { data: projects = [], isLoading: projLoading } = useProjects();

  // Fetch all project_environments grouped
  const { data: envData = [], isLoading: envLoading } = useQuery({
    queryKey: ['focco-env-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_environments')
        .select('project_id, environment_count, projetista_id, projetista:team_members!project_environments_projetista_id_fkey(name)')
        .not('project_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  const rows = useMemo<FoccoRow[]>(() => {
    const foccoProjects = projects.filter(p => p.focco_project_number);

    return foccoProjects.map(p => {
      const envs = envData.filter((e: any) => e.project_id === p.id);
      const totalAmbientes = envs.reduce((sum: number, e: any) => sum + (e.environment_count || 0), 0);

      // Get unique projetista names
      const projetistaNames = new Set<string>();
      envs.forEach((e: any) => {
        if (e.projetista?.name) projetistaNames.add(e.projetista.name);
      });

      return {
        foccoNumber: p.focco_project_number!,
        projectId: p.id,
        projectName: p.name,
        clientName: p.clients?.name || null,
        stage: p.stage,
        consultorComercial: p.responsible?.name || null,
        projetista: projetistaNames.size > 0 ? Array.from(projetistaNames).join(', ') : null,
        totalAmbientes,
      };
    }).sort((a, b) => b.foccoNumber.localeCompare(a.foccoNumber));
  }, [projects, envData]);

  const isLoading = projLoading || envLoading;

  const stageLabel = (stage: string | null) => {
    switch (stage) {
      case 'closed_won': return { label: 'Vendido', cls: 'bg-green-500/20 text-green-700 dark:text-green-400' };
      case 'closed_lost': return { label: 'Perdido', cls: 'bg-destructive/20 text-destructive' };
      case 'em_negociacao': return { label: 'Em Negociação', cls: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' };
      default: return { label: stage || '—', cls: 'bg-muted text-muted-foreground' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum projeto com número FOCCO cadastrado</p>
      </div>
    );
  }

  return (
    <div className="border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs uppercase tracking-wider">Nº FOCCO</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">Cliente</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Consultor Comercial</span>
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider">
              <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> Projetista</span>
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-right">
              <span className="flex items-center gap-1 justify-end"><Ruler className="h-3 w-3" /> Ambientes</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const stage = stageLabel(row.stage);
            return (
              <TableRow key={row.projectId}>
                <TableCell className="font-mono font-bold text-sm">{row.foccoNumber}</TableCell>
                <TableCell className="text-sm">{row.clientName || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${stage.cls} border-0`}>{stage.label}</Badge>
                </TableCell>
                <TableCell className="text-sm">{row.consultorComercial || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm">{row.projetista || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="font-bold">{row.totalAmbientes}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
