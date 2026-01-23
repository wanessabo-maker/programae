import { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, AlertCircle, Eye, Check, Clock, Calendar, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import {
  useTechnicalAssistances,
  useOpenTechnicalAssistances,
  useCreateTechnicalAssistance,
  useUpdateTechnicalAssistance,
  useCloseTechnicalAssistance,
  useATActionTypes,
  TechnicalAssistance,
} from '@/hooks/useTechnicalAssistance';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';

export function ATTab() {
  const { toast } = useToast();
  const { teamMembers } = useApp();
  const { data: allCases = [], isLoading } = useTechnicalAssistances();
  const { data: openCases = [] } = useOpenTechnicalAssistances();
  const { data: actionTypes = [] } = useATActionTypes();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();

  const createMutation = useCreateTechnicalAssistance();
  const updateMutation = useUpdateTechnicalAssistance();
  const closeMutation = useCloseTechnicalAssistance();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TechnicalAssistance | null>(null);
  const [viewTab, setViewTab] = useState<'open' | 'closed'>('open');

  // New case form
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    priority: 'medium',
    client_id: '',
    project_id: '',
    responsible_id: '',
    contact_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_date: '',
    contract_number: '',
    action_type_id: '',
  });

  // Close case form
  const [closeForm, setCloseForm] = useState({
    solution_date: format(new Date(), 'yyyy-MM-dd'),
    resolution_notes: '',
  });

  // Update visit form
  const [updateForm, setUpdateForm] = useState({
    visit_date: '',
  });

  const activeTeamMembers = useMemo(() => {
    return teamMembers.filter(m => m.active);
  }, [teamMembers]);

  const closedProjects = useMemo(() => {
    return projects.filter(p => p.stage === 'closed_won');
  }, [projects]);

  const closedCases = useMemo(() => {
    return allCases.filter(c => c.status === 'closed');
  }, [allCases]);

  const handleCreateCase = async () => {
    if (!newCase.title || !newCase.client_id || !newCase.contact_date) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: newCase.title,
        description: newCase.description || null,
        priority: newCase.priority,
        client_id: newCase.client_id,
        project_id: newCase.project_id || null,
        responsible_id: newCase.responsible_id || null,
        contact_date: newCase.contact_date,
        scheduled_date: newCase.scheduled_date || null,
        contract_number: newCase.contract_number || null,
        action_type_id: newCase.action_type_id || null,
      });

      toast({ title: 'Chamado de AT criado com sucesso' });
      setShowNewModal(false);
      setNewCase({
        title: '',
        description: '',
        priority: 'medium',
        client_id: '',
        project_id: '',
        responsible_id: '',
        contact_date: format(new Date(), 'yyyy-MM-dd'),
        scheduled_date: '',
        contract_number: '',
        action_type_id: '',
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao criar chamado', variant: 'destructive' });
    }
  };

  const handleUpdateVisitDate = async () => {
    if (!selectedCase || !updateForm.visit_date) {
      toast({ title: 'Informe a data da visita', variant: 'destructive' });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedCase.id,
        visit_date: updateForm.visit_date,
      });

      toast({ title: 'Data da visita registrada' });
      setShowViewModal(false);
      setSelectedCase(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleCloseCase = async () => {
    if (!selectedCase || !closeForm.solution_date) {
      toast({ title: 'Informe a data da solução definitiva', variant: 'destructive' });
      return;
    }

    try {
      await closeMutation.mutateAsync({
        id: selectedCase.id,
        solution_date: closeForm.solution_date,
        resolution_notes: closeForm.resolution_notes,
      });

      toast({ title: 'Chamado encerrado com sucesso' });
      setShowCloseModal(false);
      setSelectedCase(null);
      setCloseForm({
        solution_date: format(new Date(), 'yyyy-MM-dd'),
        resolution_notes: '',
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao encerrar chamado', variant: 'destructive' });
    }
  };

  const openViewModal = (atCase: TechnicalAssistance) => {
    setSelectedCase(atCase);
    setUpdateForm({ visit_date: atCase.visit_date || '' });
    setShowViewModal(true);
  };

  const openCloseModal = (atCase: TechnicalAssistance) => {
    if (!atCase.visit_date) {
      toast({ 
        title: 'Registre a data da visita técnica primeiro', 
        variant: 'destructive' 
      });
      return;
    }
    setSelectedCase(atCase);
    setCloseForm({
      solution_date: format(new Date(), 'yyyy-MM-dd'),
      resolution_notes: '',
    });
    setShowCloseModal(true);
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: 'bg-destructive/10 text-destructive',
      medium: 'bg-warning/10 text-warning',
      low: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded ${styles[priority] || styles.medium}`}>
        {labels[priority] || priority}
      </span>
    );
  };

  const getDaysOpen = (openedDate: string | null) => {
    if (!openedDate) return 0;
    return differenceInDays(new Date(), parseISO(openedDate));
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewTab('open')}
            className={`px-4 py-2 text-xs uppercase tracking-widest border ${
              viewTab === 'open' ? 'bg-foreground text-background' : 'border-border'
            }`}
          >
            Chamados Abertos ({openCases.length})
          </button>
          <button
            onClick={() => setViewTab('closed')}
            className={`px-4 py-2 text-xs uppercase tracking-widest border ${
              viewTab === 'closed' ? 'bg-foreground text-background' : 'border-border'
            }`}
          >
            Encerrados ({closedCases.length})
          </button>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary bg-foreground text-background flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Chamado AT
        </button>
      </div>

      {/* Open Cases */}
      {viewTab === 'open' && (
        <div className="space-y-4">
          {openCases.length === 0 ? (
            <div className="border border-border p-8 text-center">
              <Wrench className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Nenhum chamado de AT em aberto
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {openCases.map((atCase) => {
                const daysOpen = getDaysOpen(atCase.opened_date);
                return (
                  <div
                    key={atCase.id}
                    className="p-4 border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{atCase.title}</span>
                          {getPriorityBadge(atCase.priority)}
                          {atCase.action_type_name && (
                            <span className="text-xs px-2 py-0.5 bg-muted rounded">
                              {atCase.action_type_name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cliente: {atCase.client_name || 'N/A'}
                          {atCase.contract_number && ` | Contrato: ${atCase.contract_number}`}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Contato: {atCase.contact_date 
                              ? format(parseISO(atCase.contact_date), "dd/MM/yyyy", { locale: ptBR })
                              : '-'
                            }
                          </span>
                          {atCase.visit_date ? (
                            <span className="flex items-center gap-1 text-success">
                              <Check className="w-3 h-3" />
                              Visita: {format(parseISO(atCase.visit_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-warning">
                              <Clock className="w-3 h-3" />
                              Visita pendente
                            </span>
                          )}
                          <span className={daysOpen > 7 ? 'text-destructive' : ''}>
                            {daysOpen}d aberto
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(atCase)}
                          className="btn-secondary border-border text-xs px-3 py-1.5 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Detalhes
                        </button>
                        <button
                          onClick={() => openCloseModal(atCase)}
                          className={`btn-primary text-xs px-3 py-1.5 flex items-center gap-1 ${
                            atCase.visit_date 
                              ? 'bg-foreground text-background' 
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                          disabled={!atCase.visit_date}
                        >
                          <Check className="w-3 h-3" />
                          Encerrar
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

      {/* Closed Cases */}
      {viewTab === 'closed' && (
        <div className="space-y-4">
          {closedCases.length === 0 ? (
            <div className="border border-border p-8 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhum chamado encerrado
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Título</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Cliente</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Contato</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Visita</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Solução</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest">Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {closedCases.map((atCase) => {
                    const totalDays = atCase.contact_date && atCase.solution_date
                      ? differenceInDays(parseISO(atCase.solution_date), parseISO(atCase.contact_date))
                      : 0;
                    return (
                      <tr key={atCase.id} className="border-b border-border/50">
                        <td className="p-2">{atCase.title}</td>
                        <td className="p-2">{atCase.client_name || 'N/A'}</td>
                        <td className="p-2">
                          {atCase.contact_date 
                            ? format(parseISO(atCase.contact_date), "dd/MM/yy", { locale: ptBR })
                            : '-'
                          }
                        </td>
                        <td className="p-2">
                          {atCase.visit_date 
                            ? format(parseISO(atCase.visit_date), "dd/MM/yy", { locale: ptBR })
                            : '-'
                          }
                        </td>
                        <td className="p-2">
                          {atCase.solution_date 
                            ? format(parseISO(atCase.solution_date), "dd/MM/yy", { locale: ptBR })
                            : '-'
                          }
                        </td>
                        <td className="p-2">
                          <span className={totalDays > 30 ? 'text-destructive' : ''}>
                            {totalDays}d
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Case Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest">
              Novo Chamado de Assistência Técnica
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Título do Chamado *
              </label>
              <input
                value={newCase.title}
                onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                placeholder="Descreva brevemente o problema"
                className="input-flat w-full mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Cliente *
                </label>
                <select
                  value={newCase.client_id}
                  onChange={(e) => setNewCase({ ...newCase, client_id: e.target.value })}
                  className="input-flat w-full mt-1"
                >
                  <option value="">Selecione</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Prioridade
                </label>
                <select
                  value={newCase.priority}
                  onChange={(e) => setNewCase({ ...newCase, priority: e.target.value })}
                  className="input-flat w-full mt-1"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Projeto (opcional)
                </label>
                <select
                  value={newCase.project_id}
                  onChange={(e) => {
                    const project = closedProjects.find(p => p.id === e.target.value);
                    setNewCase({ 
                      ...newCase, 
                      project_id: e.target.value,
                      contract_number: project?.focco_project_number || newCase.contract_number,
                    });
                  }}
                  className="input-flat w-full mt-1"
                >
                  <option value="">Selecione</option>
                  {closedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.focco_project_number || p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Nº Contrato
                </label>
                <input
                  value={newCase.contract_number}
                  onChange={(e) => setNewCase({ ...newCase, contract_number: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Data do Contato *
                </label>
                <input
                  type="date"
                  value={newCase.contact_date}
                  onChange={(e) => setNewCase({ ...newCase, contact_date: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Visita Agendada
                </label>
                <input
                  type="date"
                  value={newCase.scheduled_date}
                  onChange={(e) => setNewCase({ ...newCase, scheduled_date: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Tipo de Ação
                </label>
                <select
                  value={newCase.action_type_id}
                  onChange={(e) => setNewCase({ ...newCase, action_type_id: e.target.value })}
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
                  Responsável
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
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Descrição do Problema
              </label>
              <textarea
                value={newCase.description}
                onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                className="input-flat w-full mt-1 h-20 resize-none"
                placeholder="Detalhe o problema reportado pelo cliente"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateCase}
              className="btn-primary bg-foreground text-background flex-1"
            >
              Criar Chamado
            </button>
            <button
              onClick={() => setShowNewModal(false)}
              className="btn-secondary border-border flex-1"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Update Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest">
              Detalhes do Chamado
            </DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{selectedCase.title}</span>
                  {getPriorityBadge(selectedCase.priority)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cliente: {selectedCase.client_name}
                </div>
                {selectedCase.description && (
                  <div className="text-xs mt-2">{selectedCase.description}</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 border border-border">
                  <div className="text-muted-foreground uppercase tracking-widest mb-1">
                    Contato
                  </div>
                  <div className="font-medium">
                    {selectedCase.contact_date 
                      ? format(parseISO(selectedCase.contact_date), "dd/MM/yyyy", { locale: ptBR })
                      : '-'
                    }
                  </div>
                </div>
                <div className={`p-3 border ${selectedCase.visit_date ? 'border-success' : 'border-warning'}`}>
                  <div className="text-muted-foreground uppercase tracking-widest mb-1">
                    Visita
                  </div>
                  <div className="font-medium">
                    {selectedCase.visit_date 
                      ? format(parseISO(selectedCase.visit_date), "dd/MM/yyyy", { locale: ptBR })
                      : 'Pendente'
                    }
                  </div>
                </div>
                <div className="p-3 border border-border">
                  <div className="text-muted-foreground uppercase tracking-widest mb-1">
                    Solução
                  </div>
                  <div className="font-medium">
                    {selectedCase.solution_date 
                      ? format(parseISO(selectedCase.solution_date), "dd/MM/yyyy", { locale: ptBR })
                      : 'Pendente'
                    }
                  </div>
                </div>
              </div>

              {!selectedCase.visit_date && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Registrar Data da Visita Técnica
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={updateForm.visit_date}
                      onChange={(e) => setUpdateForm({ visit_date: e.target.value })}
                      className="input-flat flex-1"
                    />
                    <button
                      onClick={handleUpdateVisitDate}
                      className="btn-primary bg-foreground text-background"
                    >
                      Registrar
                    </button>
                  </div>
                </div>
              )}

              {selectedCase.visit_date && !selectedCase.solution_date && (
                <div className="p-3 bg-warning/10 border border-warning text-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="font-medium">Aguardando Solução Definitiva</p>
                      <p className="text-muted-foreground mt-1">
                        Este chamado só pode ser encerrado após registrar a data da solução definitiva.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowViewModal(false)}
              className="btn-secondary border-border flex-1"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Case Modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest">
              Encerrar Chamado de AT
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCase && (
              <div className="p-3 bg-muted/30 border border-border text-xs">
                <p className="font-medium">{selectedCase.title}</p>
                <p className="text-muted-foreground">
                  Cliente: {selectedCase.client_name}
                </p>
              </div>
            )}

            <div className="p-3 bg-destructive/10 border border-destructive text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium">Data da Solução Definitiva Obrigatória</p>
                  <p className="text-muted-foreground mt-1">
                    O chamado só será encerrado após informar quando o problema foi definitivamente resolvido.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Data da Solução Definitiva *
              </label>
              <input
                type="date"
                value={closeForm.solution_date}
                onChange={(e) => setCloseForm({ ...closeForm, solution_date: e.target.value })}
                className="input-flat w-full mt-1"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Notas da Resolução
              </label>
              <textarea
                value={closeForm.resolution_notes}
                onChange={(e) => setCloseForm({ ...closeForm, resolution_notes: e.target.value })}
                className="input-flat w-full mt-1 h-20 resize-none"
                placeholder="Descreva como o problema foi resolvido"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCloseCase}
              className="btn-primary bg-foreground text-background flex-1"
            >
              Confirmar Encerramento
            </button>
            <button
              onClick={() => setShowCloseModal(false)}
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
