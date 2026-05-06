import { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, FileText, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  StaleProject,
  useMarkProjectLost,
  useSnoozeProjectReview,
  useStaleProjects,
} from '@/hooks/useStaleProjects';

interface Props {
  teamMemberId: string;
}

export function StaleProjectsBanner({ teamMemberId }: Props) {
  const { data: stale = [], isLoading } = useStaleProjects(teamMemberId);
  const markLost = useMarkProjectLost();
  const snooze = useSnoozeProjectReview();

  const [expanded, setExpanded] = useState(true);
  const [confirmLost, setConfirmLost] = useState<StaleProject | null>(null);

  if (isLoading || stale.length === 0) return null;

  const handleSnooze = async (project: StaleProject, days: number) => {
    try {
      await snooze.mutateAsync({ projectId: project.projectId, teamMemberId, days });
      toast.success(`Aviso adiado por ${days} dc`);
    } catch (e: any) {
      toast.error('Erro ao adiar aviso', { description: e?.message });
    }
  };

  const handleKeepActive = async (project: StaleProject) => {
    // "Ainda ativo" = adiar 30 dias
    await handleSnooze(project, 30);
  };

  const handleConfirmLost = async () => {
    if (!confirmLost) return;
    try {
      await markLost.mutateAsync(confirmLost.projectId);
      toast.success('Projeto marcado como perdido');
      setConfirmLost(null);
    } catch (e: any) {
      toast.error('Erro ao atualizar projeto', { description: e?.message });
    }
  };

  return (
    <>
      <Card className="border-2 border-amber-400/60 bg-amber-50 shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-400/20 rounded">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-amber-900">
                  Atualização Importante
                </h3>
                <p className="text-sm text-amber-900/80 mt-1">
                  {stale.length === 1
                    ? 'Você tem 1 projeto sem nova Apresentação há mais de 3 meses. Esse projeto ainda está ativo?'
                    : `Você tem ${stale.length} projetos sem nova Apresentação há mais de 3 meses. Esses projetos ainda estão ativos?`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="text-amber-900 hover:bg-amber-200/50"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {expanded && (
            <div className="space-y-2 mt-4">
              {stale.map((project) => (
                <div
                  key={project.projectId}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-background border border-amber-300/60 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {project.clientName && (
                        <span className="text-sm font-semibold flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {project.clientName}
                        </span>
                      )}
                      {project.foccoNumber && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          FOCCO {project.foccoNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Última apresentação:{' '}
                      <span className="font-medium text-foreground">
                        {format(parseISO(project.lastApresentacaoDate), "dd 'de' MMM yyyy", {
                          locale: ptBR,
                        })}
                      </span>{' '}
                      · {project.daysSince} dc atrás
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-50"
                      onClick={() => handleKeepActive(project)}
                      disabled={snooze.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Ainda Ativo
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmLost(project)}
                      disabled={markLost.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Perdido
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Adiar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSnooze(project, 30)}>
                          Adiar 30 dc
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(project, 60)}>
                          Adiar 60 dc
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(project, 90)}>
                          Adiar 90 dc
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmLost} onOpenChange={(o) => !o && setConfirmLost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar projeto como perdido?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmLost?.clientName ? `Cliente ${confirmLost.clientName} · ` : ''}
              {confirmLost?.foccoNumber ? `FOCCO ${confirmLost.foccoNumber}. ` : ''}
              O projeto será movido para "Projetos Perdidos" e sairá da Carteira Flutuante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLost}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmar Perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
