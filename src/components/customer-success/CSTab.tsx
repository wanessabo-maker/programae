import { useState, useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Check, Clock, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import {
  useCSCases,
  useCreateCSCase,
  useCSActions,
  useUpcomingCSActions,
  useUpdateCSAction,
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

  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<typeof csActions[0] | null>(null);
  const [viewTab, setViewTab] = useState<'upcoming' | 'cases' | 'history'>('upcoming');

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

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewTab('upcoming')}
            className={`px-4 py-2 text-xs uppercase tracking-widest border ${
              viewTab === 'upcoming' ? 'bg-foreground text-background' : 'border-border'
            }`}
          >
            Próximas Visitas ({upcomingActions.length})
          </button>
          <button
            onClick={() => setViewTab('cases')}
            className={`px-4 py-2 text-xs uppercase tracking-widest border ${
              viewTab === 'cases' ? 'bg-foreground text-background' : 'border-border'
            }`}
          >
            Casos Ativos ({csCases.filter(c => c.status === 'active').length})
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
        <button
          onClick={() => setShowNewCaseModal(true)}
          className="btn-primary bg-foreground text-background flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Caso CS
        </button>
      </div>

      {/* Upcoming Actions (Next 30 days) */}
      {viewTab === 'upcoming' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            Visitas programadas para os próximos 30 dias
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
                          Contrato: {action.case_contract_number} | Cliente: {action.client_name || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(action.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <button
                        onClick={() => openCompleteModal(action)}
                        className="btn-primary bg-foreground text-background text-xs px-3 py-1.5 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Concluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Active Cases */}
      {viewTab === 'cases' && (
        <div className="space-y-4">
          {csCases.filter(c => c.status === 'active').length === 0 ? (
            <div className="border border-border p-8 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhum caso de CS ativo
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {csCases.filter(c => c.status === 'active').map((csCase) => (
                <div
                  key={csCase.id}
                  className="p-4 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        Contrato: {csCase.contract_number}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Cliente: {csCase.client_name || 'N/A'} | 
                        Assinatura: {format(parseISO(csCase.signature_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {csCase.responsible_name && (
                        <div className="text-xs text-muted-foreground">
                          Responsável: {csCase.responsible_name}
                        </div>
                      )}
                    </div>
                    <div className="text-xs px-2 py-1 bg-success/10 text-success rounded">
                      Ativo
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  );
}
