import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';
import { FileText, Ruler, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FoccoRow {
  foccoNumber: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  stage: string | null;
  consultorComercial: string | null;
  projetista: string | null;
  totalAmbientes: number;
  dataCadastroProjetista: string | null;
  dataApresentacao: string | null;
  valorApresentado: number | null;
}

export function FoccoProjectsTable() {
  const { data: projects = [], isLoading: projLoading } = useProjects();

  // Fetch all project_environments grouped
  const { data: envData = [], isLoading: envLoading } = useQuery({
    queryKey: ['focco-env-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_environments')
        .select('project_id, environment_count, projetista_id, created_at, projetista:team_members!project_environments_projetista_id_fkey(name)')
        .not('project_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch presentation actions (Apresentação de Projeto)
  const { data: presActions = [], isLoading: actLoading } = useQuery({
    queryKey: ['focco-presentation-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actions')
        .select('project_id, focco_project_number, action_date, value, action_types!inner(classification)')
        .eq('action_types.classification', 'apresentacao');
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

      // Earliest environment created_at = data cadastro projetista
      const sortedEnvs = [...envs].sort((a: any, b: any) => (a.created_at || '').localeCompare(b.created_at || ''));
      const dataCadastroProjetista = sortedEnvs.length > 0 ? sortedEnvs[0].created_at?.split('T')[0] || null : null;

      // Presentation action date and value
      const projPresActions = presActions.filter((a: any) =>
        a.project_id === p.id || a.focco_project_number === p.focco_project_number
      ).sort((a: any, b: any) => (b.action_date || '').localeCompare(a.action_date || ''));
      
      const latestPres = projPresActions.length > 0 ? projPresActions[0] : null;
      const dataApresentacao = latestPres?.action_date || null;
      const valorApresentado = p.estimated_value || (latestPres as any)?.value || null;

      return {
        foccoNumber: p.focco_project_number!,
        projectId: p.id,
        projectName: p.name,
        clientName: p.clients?.name || null,
        stage: p.stage,
        consultorComercial: p.responsible?.name || null,
        projetista: projetistaNames.size > 0 ? Array.from(projetistaNames).join(', ') : null,
        totalAmbientes,
        dataCadastroProjetista,
        dataApresentacao,
        valorApresentado,
      };
    }).sort((a, b) => b.foccoNumber.localeCompare(a.foccoNumber));
  }, [projects, envData, presActions]);

  const isLoading = projLoading || envLoading || actLoading;

  const stageLabel = (stage: string | null) => {
    switch (stage) {
      case 'closed_won': return { label: 'Vendido', cls: 'bg-green-500/20 text-green-700 dark:text-green-400' };
      case 'closed_lost': return { label: 'Perdido', cls: 'bg-destructive/20 text-destructive' };
      case 'em_negociacao': return { label: 'Em Negociação', cls: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' };
      default: return { label: stage || '—', cls: 'bg-muted text-muted-foreground' };
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground">—</span>;
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return <span className="text-muted-foreground">—</span>;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Consultor</span>
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider">
              <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> Projetista</span>
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-center">Cadastro Proj.</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-center">Apresentação</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-right">Valor Apres.</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-right">
              <span className="flex items-center gap-1 justify-end"><Ruler className="h-3 w-3" /> Amb.</span>
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
                <TableCell className="text-center text-sm">{formatDate(row.dataCadastroProjetista)}</TableCell>
                <TableCell className="text-center text-sm">{formatDate(row.dataApresentacao)}</TableCell>
                <TableCell className="text-right text-sm font-medium">{formatCurrency(row.valorApresentado)}</TableCell>
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
