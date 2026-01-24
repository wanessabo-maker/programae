import { useState, useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Check, Clock, Users, Calendar, Pencil, Trash2, Download, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useExportData, ExportColumn } from '@/hooks/useExportData';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import {
  useCSCases,
  useCreateCSCase,
  useCSActions,
  useUpcomingCSActions,
  useUpdateCSAction,
  useDeleteCSAction,
  useCSContactSchedules,
  useCSActionTypes,
  generateCSActionsForCase,
} from '@/hooks/useCustomerSuccess';
import { useProjects } from '@/hooks/useProjects';

export function CSTab() {
  const { toast } = useToast();
  const { teamMembers } = useApp();
  const { data: csCases = [], isLoading: casesLoading } = useCSCases();
  const { data: csActions = [] } = useCSActions();
  const { data: upcomingActions = [] } = useUpcomingCSActions(30);
  const { data: schedules = [] } = useCSContactSchedules();
  const { data: actionTypes = [] } = useCSActionTypes();
  const { data: projects = [] } = useProjects();
  
  const createCaseMutation = useCreateCSCase();
  const updateActionMutation = useUpdateCSAction();
  const deleteActionMutation = useDeleteCSAction();

  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<typeof csActions[0] | null>(null);
  const [actionToDelete, setActionToDelete] = useState<typeof csActions[0] | null>(null);
  const [viewTab, setViewTab] = useState<'cases' | 'upcoming' | 'history'>('cases');

  // Edit action form
  const [editForm, setEditForm] = useState({
    scheduled_date: '',
    action_type_id: '',
    performed_by: '',
    notes: '',
    status: 'pending',
    completed_date: '',
  });

  // New case form
  const [newCase, setNewCase] = useState({
    contract_number: '',
    client_id: '',
    project_id: '',
    signature_date: format(new Date(), 'yyyy-MM-dd'),
    responsible_id: '',
    notes: '',
  });

  // Complete action form
  const [completeForm, setCompleteForm] = useState({
    action_type_id: '',
    completed_date: format(new Date(), 'yyyy-MM-dd'),
    performed_by: '',
    notes: '',
  });

  // Get closed projects (contratos)
  const closedProjects = useMemo(() => {
    return projects.filter(p => p.stage === 'closed_won');
  }, [projects]);

  // Get active team members
  const activeTeamMembers = useMemo(() => {
    return teamMembers.filter(m => m.active);
  }, [teamMembers]);

  // Active clients with their next scheduled visit
  const activeClientsWithNextVisit = useMemo(() => {
    const activeCases = csCases.filter(c => c.status === 'active');
    
    return activeCases.map(csCase => {
      // Get pending actions for this case
      const caseActions = csActions.filter(a => 
        a.cs_case_id === csCase.id && a.status === 'pending'
      );
      
      // Find next scheduled action
      const sortedActions = caseActions.sort((a, b) => 
        new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      );
      
      const nextAction = sortedActions[0];
      const completedActions = csActions.filter(a => 
        a.cs_case_id === csCase.id && a.status === 'completed'
      ).length;
      
      const totalScheduledActions = csActions.filter(a => 
        a.cs_case_id === csCase.id
      ).length;
      
      const daysUntilNext = nextAction 
        ? differenceInDays(parseISO(nextAction.scheduled_date), new Date())
        : null;

      return {
        ...csCase,
        nextAction,
        daysUntilNext,
        completedActions,
        totalScheduledActions,
        pendingActions: caseActions.length,
      };
    }).sort((a, b) => {
      // Sort by days until next (nulls last, then ascending)
      if (a.daysUntilNext === null && b.daysUntilNext === null) return 0;
      if (a.daysUntilNext === null) return 1;
      if (b.daysUntilNext === null) return -1;
      return a.daysUntilNext - b.daysUntilNext;
    });
  }, [csCases, csActions]);

  const handleCreateCase = async () => {
    if (!newCase.contract_number || !newCase.signature_date) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      const result = await createCaseMutation.mutateAsync({
        contract_number: newCase.contract_number,
        client_id: newCase.client_id || null,
        project_id: newCase.project_id || null,
        signature_date: newCase.signature_date,
        responsible_id: newCase.responsible_id || null,
        notes: newCase.notes || null,
      });

      // Generate CS actions based on schedules
      if (result.id && schedules.length > 0) {
        await generateCSActionsForCase(result.id, newCase.signature_date, schedules);
      }

      toast({ title: 'Caso de CS criado com sucesso' });
      setShowNewCaseModal(false);
      setNewCase({
        contract_number: '',
        client_id: '',
        project_id: '',
        signature_date: format(new Date(), 'yyyy-MM-dd'),
        responsible_id: '',
        notes: '',
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao criar caso de CS', variant: 'destructive' });
    }
  };

  const handleCompleteAction = async () => {
    if (!selectedAction || !completeForm.completed_date) {
      toast({ title: 'Preencha a data de conclusão', variant: 'destructive' });
      return;
    }

    try {
      await updateActionMutation.mutateAsync({
        id: selectedAction.id,
        status: 'completed',
        completed_date: completeForm.completed_date,
        action_type_id: completeForm.action_type_id || null,
        performed_by: completeForm.performed_by || null,
        notes: completeForm.notes || null,
      });

      toast({ title: 'Ação concluída com sucesso' });
      setShowCompleteModal(false);
      setSelectedAction(null);
      setCompleteForm({
        action_type_id: '',
        completed_date: format(new Date(), 'yyyy-MM-dd'),
        performed_by: '',
        notes: '',
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao concluir ação', variant: 'destructive' });
    }
  };

  const openCompleteModal = (action: typeof csActions[0]) => {
    setSelectedAction(action);
    setCompleteForm({
      action_type_id: action.action_type_id || '',
      completed_date: format(new Date(), 'yyyy-MM-dd'),
      performed_by: action.performed_by || '',
      notes: action.notes || '',
    });
    setShowCompleteModal(true);
  };

  const openEditModal = (action: typeof csActions[0]) => {
    setSelectedAction(action);
    setEditForm({
      scheduled_date: action.scheduled_date,
      action_type_id: action.action_type_id || '',
      performed_by: action.performed_by || '',
      notes: action.notes || '',
      status: action.status,
      completed_date: action.completed_date || '',
    });
    setShowEditModal(true);
  };

  const handleEditAction = async () => {
    if (!selectedAction) return;

    try {
      await updateActionMutation.mutateAsync({
        id: selectedAction.id,
        scheduled_date: editForm.scheduled_date,
        action_type_id: editForm.action_type_id || null,
        performed_by: editForm.performed_by || null,
        notes: editForm.notes || null,
        status: editForm.status,
        completed_date: editForm.status === 'completed' ? (editForm.completed_date || null) : null,
      });

      toast({ title: 'Ocorrência atualizada com sucesso' });
      setShowEditModal(false);
      setSelectedAction(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao atualizar ocorrência', variant: 'destructive' });
    }
  };

  const openDeleteDialog = (action: typeof csActions[0]) => {
    setActionToDelete(action);
    setShowDeleteDialog(true);
  };

  const handleDeleteAction = async () => {
    if (!actionToDelete) return;

    try {
      await deleteActionMutation.mutateAsync(actionToDelete.id);
      toast({ title: 'Ocorrência excluída com sucesso' });
      setShowDeleteDialog(false);
      setActionToDelete(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao excluir ocorrência', variant: 'destructive' });
    }
  };

  const getDaysUntil = (dateStr: string) => {
    return differenceInDays(parseISO(dateStr), new Date());
  };

  const getUrgencyClass = (days: number) => {
    if (days < 0) return 'text-destructive bg-destructive/10';
    if (days <= 7) return 'text-warning bg-warning/10';
    return 'text-muted-foreground bg-muted';
  };

  if (casesLoading) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const { exportToFile } = useExportData();

  const handleExportCS = (exportFormat: 'xlsx' | 'csv') => {
    if (viewTab === 'cases') {
      const columns: ExportColumn<typeof activeClientsWithNextVisit[0]>[] = [
        { key: 'client_name', header: 'Cliente' },
        { key: 'contract_number', header: 'Contrato' },
        { key: 'signature_date', header: 'Data Assinatura', formatter: (v) => v ? format(parseISO(v as string), 'dd/MM/yyyy') : '' },
        { key: 'responsible_name', header: 'Responsável' },
        { key: 'completedActions', header: 'Visitas Concluídas', formatter: (v) => String(v) },
        { key: 'totalScheduledActions', header: 'Total Visitas', formatter: (v) => String(v) },
        { key: 'pendingActions', header: 'Pendentes', formatter: (v) => String(v) },
        { key: 'daysUntilNext', header: 'Dias até Próxima', formatter: (v) => v !== null ? String(v) : 'Ciclo Completo' },
      ];
      
      if (activeClientsWithNextVisit.length === 0) {
        toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
        return;
      }
      
      const success = exportToFile(activeClientsWithNextVisit, columns, { filename: 'cs_clientes_ativos', format: exportFormat });
      if (success) toast({ title: `Dados exportados com sucesso (${exportFormat.toUpperCase()})` });
      
    } else if (viewTab === 'upcoming') {
      const columns: ExportColumn<typeof upcomingActions[0]>[] = [
        { key: 'scheduled_date', header: 'Data Agendada', formatter: (v) => v ? format(parseISO(v as string), 'dd/MM/yyyy') : '' },
        { key: 'case_contract_number', header: 'Contrato' },
        { key: 'client_name', header: 'Cliente' },
        { key: 'schedule_name', header: 'Tipo Contato' },
        { key: 'status', header: 'Status' },
      ];
      
      if (upcomingActions.length === 0) {
        toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
        return;
      }
      
      const success = exportToFile(upcomingActions, columns, { filename: 'cs_proximos_30_dias', format: exportFormat });
      if (success) toast({ title: `Dados exportados com sucesso (${exportFormat.toUpperCase()})` });
      
    } else {
      const historyActions = csActions.filter(a => a.status === 'completed');
      const columns: ExportColumn<typeof historyActions[0]>[] = [
        { key: 'completed_date', header: 'Data Conclusão', formatter: (v) => v ? format(parseISO(v as string), 'dd/MM/yyyy') : '' },
        { key: 'case_contract_number', header: 'Contrato' },
        { key: 'client_name', header: 'Cliente' },
        { key: 'action_type_name', header: 'Tipo' },
        { key: 'performed_by_name', header: 'Realizado por' },
        { key: 'notes', header: 'Observações' },
      ];
      
      if (historyActions.length === 0) {
        toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
        return;
      }
      
      const success = exportToFile(historyActions, columns, { filename: 'cs_historico', format: exportFormat });
      if (success) toast({ title: `Dados exportados com sucesso (${exportFormat.toUpperCase()})` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewTab('cases')}
            className={`px-4 py-2 text-xs uppercase tracking-widest border ${
              viewTab === 'cases' ? 'bg-foreground text-background' : 'border-border'
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />
            Clientes Ativos ({activeClientsWithNextVisit.length})
          </button>
          <button
            onClick={() => setViewTab('upcoming')}
            className={`px-4 py-2 text-xs uppercase tracking-widest border ${
              viewTab === 'upcoming' ? 'bg-foreground text-background' : 'border-border'
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            Próximos 30 dias ({upcomingActions.length})
          </button>
          <button
            onClick={() => setViewTab('history')}
            className={`px-4 py-2 text-xs uppercase tracking-widest border ${
              viewTab === 'history' ? 'bg-foreground text-background' : 'border-border'
            }`}
          >
            Histórico
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <button
              className="btn-secondary border-border flex items-center gap-2 text-xs"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-background border border-border shadow-md z-10 min-w-[120px]">
              <button
                onClick={() => handleExportCS('xlsx')}
                className="px-4 py-2 text-xs text-left hover:bg-muted transition-colors"
              >
                Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExportCS('csv')}
                className="px-4 py-2 text-xs text-left hover:bg-muted transition-colors"
              >
                CSV (.csv)
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="btn-primary bg-foreground text-background flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Caso CS
          </button>
        </div>
      </div>

      {/* Active Clients with Next Visit Countdown */}
      {viewTab === 'cases' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-4 h-4" />
            Clientes com ciclo de visitas ativo (pós-entrega de certificado de garantia)
          </div>

          {activeClientsWithNextVisit.length === 0 ? (
            <div className="border border-border p-8 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhum cliente ativo no momento
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeClientsWithNextVisit.map((csCase) => (
                <div
                  key={csCase.id}
                  className="p-4 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          {csCase.client_name || 'Cliente não identificado'}
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                          Contrato: {csCase.contract_number}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Assinatura: {format(parseISO(csCase.signature_date), "dd/MM/yyyy", { locale: ptBR })}
                        {csCase.responsible_name && ` | Responsável: ${csCase.responsible_name}`}
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progresso das visitas</span>
                          <span className="font-medium">{csCase.completedActions}/{csCase.totalScheduledActions}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ 
                              width: csCase.totalScheduledActions > 0 
                                ? `${(csCase.completedActions / csCase.totalScheduledActions) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Next visit countdown */}
                    <div className="ml-4 text-right">
                      {csCase.nextAction ? (
                        <div>
                          <div className={`inline-block px-3 py-1.5 text-xs font-medium rounded ${getUrgencyClass(csCase.daysUntilNext || 0)}`}>
                            {csCase.daysUntilNext !== null && (
                              csCase.daysUntilNext < 0 
                                ? `${Math.abs(csCase.daysUntilNext)}d atrasado`
                                : csCase.daysUntilNext === 0 
                                ? 'Hoje'
                                : `Em ${csCase.daysUntilNext}d`
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {format(parseISO(csCase.nextAction.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {csCase.nextAction.schedule_name || 'Próximo contato'}
                          </div>
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => openCompleteModal(csCase.nextAction)}
                              className="btn-primary bg-foreground text-background text-xs px-3 py-1 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Concluir
                            </button>
                            <button
                              onClick={() => openEditModal(csCase.nextAction)}
                              className="btn-secondary border-border text-xs px-2 py-1"
                              title="Editar"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(csCase.nextAction)}
                              className="btn-secondary border-destructive/50 text-destructive text-xs px-2 py-1"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs px-3 py-1.5 bg-success/10 text-success rounded">
                          <Check className="w-3 h-3 inline mr-1" />
                          Ciclo Completo
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Actions (Next 30 days) - Reminder View */}
      {viewTab === 'upcoming' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            Lembrete: Visitas programadas para os próximos 30 dias
          </div>

          {upcomingActions.length === 0 ? (
            <div className="border border-border p-8 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhuma visita programada para os próximos 30 dias
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingActions.map((action) => {
                const daysUntil = getDaysUntil(action.scheduled_date);
                return (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-4 border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`px-2 py-1 text-xs font-medium rounded ${getUrgencyClass(daysUntil)}`}>
                        {daysUntil < 0 
                          ? `${Math.abs(daysUntil)}d atrasado`
                          : daysUntil === 0 
                          ? 'Hoje'
                          : `Em ${daysUntil}d`
                        }
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {action.schedule_name || 'Contato CS'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cliente: {action.client_name || 'N/A'} | Contrato: {action.case_contract_number}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(action.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openCompleteModal(action)}
                          className="btn-primary bg-foreground text-background text-xs px-3 py-1.5 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Concluir
                        </button>
                        <button
                          onClick={() => openEditModal(action)}
                          className="btn-secondary border-border text-xs px-2 py-1.5"
                          title="Editar"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(action)}
                          className="btn-secondary border-destructive/50 text-destructive text-xs px-2 py-1.5"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {viewTab === 'history' && (
        <div className="space-y-4">
          {csActions.filter(a => a.status === 'completed').length === 0 ? (
            <div className="border border-border p-8 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhuma ação concluída
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Data</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Contrato</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Cliente</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Tipo</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Realizado por</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {csActions.filter(a => a.status === 'completed').map((action) => (
                    <tr key={action.id} className="border-b border-border/50">
                      <td className="p-2">
                        {action.completed_date 
                          ? format(parseISO(action.completed_date), "dd/MM/yyyy", { locale: ptBR })
                          : '-'
                        }
                      </td>
                      <td className="p-2">{action.case_contract_number}</td>
                      <td className="p-2">{action.client_name || 'N/A'}</td>
                      <td className="p-2">{action.action_type_name || action.schedule_name || 'Contato'}</td>
                      <td className="p-2">{action.performed_by_name || 'N/A'}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditModal(action)}
                            className="btn-secondary border-border text-xs px-2 py-1"
                            title="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(action)}
                            className="btn-secondary border-destructive/50 text-destructive text-xs px-2 py-1"
                            title="Excluir"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Case Modal */}
      <Dialog open={showNewCaseModal} onOpenChange={setShowNewCaseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest">
              Novo Caso de Customer Success
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Número do Contrato *
              </label>
              <select
                value={newCase.contract_number}
                onChange={(e) => {
                  const project = closedProjects.find(p => 
                    p.focco_project_number === e.target.value || 
                    String(p.id) === e.target.value
                  );
                  setNewCase({
                    ...newCase,
                    contract_number: e.target.value,
                    project_id: project?.id || '',
                    client_id: project?.client_id || '',
                  });
                }}
                className="input-flat w-full mt-1"
              >
                <option value="">Selecione um contrato</option>
                {closedProjects.map((p) => (
                  <option key={p.id} value={p.focco_project_number || p.id}>
                    {p.focco_project_number || p.name} - {p.clients?.name || 'Cliente não vinculado'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Data de Assinatura do Certificado *
              </label>
              <input
                type="date"
                value={newCase.signature_date}
                onChange={(e) => setNewCase({ ...newCase, signature_date: e.target.value })}
                className="input-flat w-full mt-1"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Responsável CS
              </label>
              <select
                value={newCase.responsible_id}
                onChange={(e) => setNewCase({ ...newCase, responsible_id: e.target.value })}
                className="input-flat w-full mt-1"
              >
                <option value="">Selecione</option>
                {activeTeamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Observações
              </label>
              <textarea
                value={newCase.notes}
                onChange={(e) => setNewCase({ ...newCase, notes: e.target.value })}
                className="input-flat w-full mt-1 h-20 resize-none"
              />
            </div>

            <div className="p-3 bg-muted/30 border border-border text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium">Ações automáticas serão criadas:</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {schedules.filter(s => s.is_active).map((s) => (
                      <li key={s.id}>• {s.name} - {s.days_after_signature} dias após assinatura</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateCase}
              className="btn-primary bg-foreground text-background flex-1"
            >
              Criar Caso
            </button>
            <button
              onClick={() => setShowNewCaseModal(false)}
              className="btn-secondary border-border flex-1"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Action Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest">
              Concluir Ação de CS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAction && (
              <div className="p-3 bg-muted/30 border border-border text-xs">
                <p className="font-medium">{selectedAction.schedule_name || 'Contato CS'}</p>
                <p className="text-muted-foreground">
                  Contrato: {selectedAction.case_contract_number}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Data de Conclusão *
              </label>
              <input
                type="date"
                value={completeForm.completed_date}
                onChange={(e) => setCompleteForm({ ...completeForm, completed_date: e.target.value })}
                className="input-flat w-full mt-1"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Tipo de Ação
              </label>
              <select
                value={completeForm.action_type_id}
                onChange={(e) => setCompleteForm({ ...completeForm, action_type_id: e.target.value })}
                className="input-flat w-full mt-1"
              >
                <option value="">Selecione</option>
                {actionTypes.filter(t => t.is_active).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Realizado por
              </label>
              <select
                value={completeForm.performed_by}
                onChange={(e) => setCompleteForm({ ...completeForm, performed_by: e.target.value })}
                className="input-flat w-full mt-1"
              >
                <option value="">Selecione</option>
                {activeTeamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Observações
              </label>
              <textarea
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                className="input-flat w-full mt-1 h-20 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCompleteAction}
              className="btn-primary bg-foreground text-background flex-1"
            >
              Confirmar Conclusão
            </button>
            <button
              onClick={() => setShowCompleteModal(false)}
              className="btn-secondary border-border flex-1"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Action Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest">
              Editar Ocorrência de CS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAction && (
              <div className="p-3 bg-muted/30 border border-border text-xs">
                <p className="font-medium">{selectedAction.schedule_name || 'Contato CS'}</p>
                <p className="text-muted-foreground">
                  Contrato: {selectedAction.case_contract_number} | Cliente: {selectedAction.client_name || 'N/A'}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="input-flat w-full mt-1"
              >
                <option value="pending">Pendente</option>
                <option value="completed">Concluída</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Data Agendada
              </label>
              <input
                type="date"
                value={editForm.scheduled_date}
                onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                className="input-flat w-full mt-1"
              />
            </div>

            {editForm.status === 'completed' && (
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Data de Conclusão
                </label>
                <input
                  type="date"
                  value={editForm.completed_date}
                  onChange={(e) => setEditForm({ ...editForm, completed_date: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
            )}

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Tipo de Ação
              </label>
              <select
                value={editForm.action_type_id}
                onChange={(e) => setEditForm({ ...editForm, action_type_id: e.target.value })}
                className="input-flat w-full mt-1"
              >
                <option value="">Selecione</option>
                {actionTypes.filter(t => t.is_active).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Realizado por
              </label>
              <select
                value={editForm.performed_by}
                onChange={(e) => setEditForm({ ...editForm, performed_by: e.target.value })}
                className="input-flat w-full mt-1"
              >
                <option value="">Selecione</option>
                {activeTeamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Observações
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="input-flat w-full mt-1 h-20 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleEditAction}
              className="btn-primary bg-foreground text-background flex-1"
            >
              Salvar Alterações
            </button>
            <button
              onClick={() => setShowEditModal(false)}
              className="btn-secondary border-border flex-1"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ocorrência?
              {actionToDelete && (
                <div className="mt-2 p-3 bg-muted/30 border border-border rounded text-sm">
                  <p><strong>Tipo:</strong> {actionToDelete.schedule_name || 'Contato CS'}</p>
                  <p><strong>Contrato:</strong> {actionToDelete.case_contract_number}</p>
                  <p><strong>Data:</strong> {actionToDelete.scheduled_date ? format(parseISO(actionToDelete.scheduled_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}</p>
                </div>
              )}
              <p className="mt-2 text-destructive">Esta ação não pode ser desfeita.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
