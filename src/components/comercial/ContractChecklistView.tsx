import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Clock,
  User,
  AlertTriangle,
  UserCog
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  useContractChecklist, 
  getWorkflowStatusLabel,
  getResponsibleAreaLabel 
} from '@/hooks/useChecklist';
import { useApp } from '@/contexts/AppContext';
import { ReassignChecklistProfessionalsModal } from './ReassignChecklistProfessionalsModal';

interface ContractChecklistViewProps {
  projectId: string;
}

export function ContractChecklistView({ projectId }: ContractChecklistViewProps) {
  const { data: checklistData, isLoading } = useContractChecklist(projectId);
  const { teamMembers } = useApp();
  const [reassignModalOpen, setReassignModalOpen] = useState(false);

  const getTeamMemberName = (id: string | null) => {
    if (!id) return null;
    return teamMembers.find(m => m.id === id)?.name || null;
  };

  const assignedProjetistaName = getTeamMemberName(checklistData?.assigned_projetista_id);
  const assignedLogisticaName = getTeamMemberName(checklistData?.assigned_logistica_id);
  const assignedCsName = getTeamMemberName((checklistData as any)?.assigned_cs_id);

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
      <div className="py-4 text-center text-neutral-300">
        Carregando checklist...
      </div>
    );
  }

  if (!checklistData) {
    return (
      <div className="py-4 text-center border border-dashed border-neutral-500 rounded-lg">
        <AlertTriangle className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
        <p className="text-sm text-neutral-200">
          Checklist não encontrado para este contrato.
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          O checklist é criado automaticamente ao registrar uma venda.
        </p>
      </div>
    );
  }

  const items = checklistData.checklist_items || [];

  return (
    <div className="space-y-4">
      {/* Header with Progress */}
      <div className="bg-neutral-700 p-4 rounded-lg space-y-3 border border-neutral-600">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium">
              Status do Workflow
            </span>
            <p className="font-semibold text-white">
              {getWorkflowStatusLabel(checklistData.workflow_status || 'formalizacao')}
            </p>
          </div>
          <Badge 
            variant={checklistData.is_completed ? 'default' : 'secondary'}
            className="font-semibold bg-neutral-600 text-white border-neutral-500"
          >
            {checklistData.is_completed ? 'Concluído' : `Etapa ${checklistData.current_step}/18`}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-300 font-medium">
            <span>Progresso</span>
            <span className="font-bold">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2 bg-neutral-600" />
        </div>

        {currentStep && (
          <div className="pt-2 border-t border-neutral-500">
            <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium">
              Etapa Atual
            </span>
            <p className="text-sm font-semibold mt-1 text-white">{currentStep.name}</p>
            <p className="text-xs text-neutral-300 font-medium">
              Responsável: {getResponsibleAreaLabel(currentStep.responsible_area)}
            </p>
          </div>
        )}
      </div>

      {/* Assigned Professionals */}
      <div className="bg-neutral-700 p-4 rounded-lg border border-neutral-600">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium">
            Responsáveis Atribuídos
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-neutral-300 hover:text-white hover:bg-neutral-600"
            onClick={() => setReassignModalOpen(true)}
          >
            <UserCog className="h-3.5 w-3.5 mr-1" />
            Reatribuir
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-neutral-400 mb-1">Projetista Técnico</p>
            <p className="text-sm font-medium text-white">
              {assignedProjetistaName || (
                <span className="text-neutral-500 italic">Não atribuído</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">Analista de Logística</p>
            <p className="text-sm font-medium text-white">
              {assignedLogisticaName || (
                <span className="text-neutral-500 italic">Não atribuído</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">Analista de CS</p>
            <p className="text-sm font-medium text-white">
              {assignedCsName || (
                <span className="text-neutral-500 italic">Não atribuído</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      {checklistData && (
        <ReassignChecklistProfessionalsModal
          open={reassignModalOpen}
          onOpenChange={setReassignModalOpen}
          checklistId={checklistData.id}
          currentProjetistaId={checklistData.assigned_projetista_id}
          currentLogisticaId={checklistData.assigned_logistica_id}
          currentCsId={(checklistData as any).assigned_cs_id}
        />
      )}

      {/* Checklist Items */}
      <div className="space-y-1">
        <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-2">
          Todas as Etapas
        </span>
        
        <div className="border border-neutral-600 rounded-lg divide-y divide-neutral-600">
          {items.map((item: any) => {
            const isCompleted = item.status === 'completed';
            const isActive = item.status === 'active';
            const isBlocked = item.status === 'blocked';
            const completedBy = getTeamMemberName(item.completed_by);
            
            return (
              <div 
                key={item.id}
                className={`p-3 flex items-start gap-3 ${
                  isActive ? 'bg-neutral-600' : ''
                } ${isBlocked ? 'opacity-60' : ''}`}
              >
                {/* Status Icon */}
                <div className="pt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : isActive ? (
                    <Circle className="h-5 w-5 text-white" />
                  ) : (
                    <Lock className="h-5 w-5 text-neutral-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${isCompleted ? 'line-through text-neutral-500' : 'text-white'}`}>
                        <span className="text-xs text-neutral-400 mr-2 font-semibold">
                          {item.step_order}.
                        </span>
                        {item.name}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5 font-medium">
                        {getResponsibleAreaLabel(item.responsible_area)}
                      </p>
                    </div>
                    
                    <Badge 
                      variant={isCompleted ? 'default' : isActive ? 'secondary' : 'outline'}
                      className={`shrink-0 text-xs font-semibold ${
                        isCompleted ? 'bg-green-600 text-white' : 
                        isActive ? 'bg-white text-neutral-900' : 
                        'border-neutral-500 text-neutral-400'
                      }`}
                    >
                      {isCompleted ? 'Concluído' : isActive ? 'Ativo' : 'Bloqueado'}
                    </Badge>
                  </div>

                  {/* Completion Info */}
                  {isCompleted && item.completed_at && (
                    <div className="mt-2 text-xs text-neutral-400 flex items-center gap-3 font-medium">
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
                    <p className="mt-1 text-xs text-neutral-300 bg-neutral-700 p-2 rounded border border-neutral-600">
                      {item.notes}
                    </p>
                  )}

                  {/* Due Date for active item */}
                  {isActive && item.due_date && (
                    <p className="mt-1 text-xs text-orange-400 font-semibold flex items-center gap-1">
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
