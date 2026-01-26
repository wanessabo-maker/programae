import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Clock,
  User,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  useContractChecklist, 
  getWorkflowStatusLabel,
  getResponsibleAreaLabel 
} from '@/hooks/useChecklist';
import { useApp } from '@/contexts/AppContext';

interface ContractChecklistViewProps {
  projectId: string;
}

export function ContractChecklistView({ projectId }: ContractChecklistViewProps) {
  const { data: checklistData, isLoading } = useContractChecklist(projectId);
  const { teamMembers } = useApp();

  const getTeamMemberName = (id: string | null) => {
    if (!id) return null;
    return teamMembers.find(m => m.id === id)?.name || null;
  };

  const progressPercentage = useMemo(() => {
    if (!checklistData?.checklist_items?.length) return 0;
    const completed = checklistData.checklist_items.filter(
      (item: any) => item.status === 'completed'
    ).length;
    return Math.round((completed / checklistData.checklist_items.length) * 100);
  }, [checklistData]);

  const currentStep = useMemo(() => {
    if (!checklistData?.checklist_items?.length) return null;
    return checklistData.checklist_items.find((item: any) => item.status === 'active');
  }, [checklistData]);

  if (isLoading) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        Carregando checklist...
      </div>
    );
  }

  if (!checklistData) {
    return (
      <div className="py-4 text-center border border-dashed border-border rounded-lg">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Checklist não encontrado para este contrato.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          O checklist é criado automaticamente ao registrar uma venda.
        </p>
      </div>
    );
  }

  const items = checklistData.checklist_items || [];

  return (
    <div className="space-y-4">
      {/* Header with Progress */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs tracking-widest uppercase text-muted-foreground">
              Status do Workflow
            </span>
            <p className="font-medium">
              {getWorkflowStatusLabel(checklistData.workflow_status || 'formalizacao')}
            </p>
          </div>
          <Badge variant={checklistData.is_completed ? 'default' : 'secondary'}>
            {checklistData.is_completed ? 'Concluído' : `Etapa ${checklistData.current_step}/18`}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {currentStep && (
          <div className="pt-2 border-t border-border">
            <span className="text-xs tracking-widest uppercase text-muted-foreground">
              Etapa Atual
            </span>
            <p className="text-sm font-medium mt-1">{currentStep.name}</p>
            <p className="text-xs text-muted-foreground">
              Responsável: {getResponsibleAreaLabel(currentStep.responsible_area)}
            </p>
          </div>
        )}
      </div>

      {/* Checklist Items */}
      <div className="space-y-1">
        <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
          Todas as Etapas
        </span>
        
        <div className="border border-border rounded-lg divide-y divide-border">
          {items.map((item: any) => {
            const isCompleted = item.status === 'completed';
            const isActive = item.status === 'active';
            const isBlocked = item.status === 'blocked';
            const completedBy = getTeamMemberName(item.completed_by);
            
            return (
              <div 
                key={item.id}
                className={`p-3 flex items-start gap-3 ${
                  isActive ? 'bg-primary/5' : ''
                } ${isBlocked ? 'opacity-50' : ''}`}
              >
                {/* Status Icon */}
                <div className="pt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : isActive ? (
                    <Circle className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        <span className="text-xs text-muted-foreground mr-2">
                          {item.step_order}.
                        </span>
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getResponsibleAreaLabel(item.responsible_area)}
                      </p>
                    </div>
                    
                    <Badge 
                      variant={isCompleted ? 'default' : isActive ? 'secondary' : 'outline'}
                      className="shrink-0 text-xs"
                    >
                      {isCompleted ? 'Concluído' : isActive ? 'Ativo' : 'Bloqueado'}
                    </Badge>
                  </div>

                  {/* Completion Info */}
                  {isCompleted && item.completed_at && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(item.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {completedBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {completedBy}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <p className="mt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      {item.notes}
                    </p>
                  )}

                  {/* Due Date for active item */}
                  {isActive && item.due_date && (
                    <p className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Prazo: {format(parseISO(item.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
