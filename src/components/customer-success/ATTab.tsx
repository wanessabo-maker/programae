import { useState, useMemo } from 'react';
import { safeParseFloat } from '@/lib/validators';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Eye, Check, Clock, Calendar, Wrench, Pencil, Trash2, Download, UserPlus, AlertCircle, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useExportData, ExportColumn } from '@/hooks/useExportData';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { ATDashboard } from './ATDashboard';
import {
  useTechnicalAssistances,
  useOpenTechnicalAssistances,
  useCreateTechnicalAssistance,
  useUpdateTechnicalAssistance,
  useCloseTechnicalAssistance,
  useDeleteTechnicalAssistance,
  useATActionTypes,
  TechnicalAssistance,
} from '@/hooks/useTechnicalAssistance';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import ClienteHistoryButton from '@/components/ClienteHistoryButton';

export function ATTab() {
  const { toast } = useToast();
  const { teamMembers } = useApp();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const { data: allCases = [], isLoading } = useTechnicalAssistances();
  const { data: openCases = [] } = useOpenTechnicalAssistances();
  const { data: actionTypes = [] } = useATActionTypes();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();

  const createMutation = useCreateTechnicalAssistance();
  const updateMutation = useUpdateTechnicalAssistance();
  const closeMutation = useCloseTechnicalAssistance();
  const deleteMutation = useDeleteTechnicalAssistance();
  const createClientMutation = useCreateClient();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TechnicalAssistance | null>(null);
  const [viewTab, setViewTab] = useState<'dashboard' | 'open' | 'closed'>('open');

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

  // Edit case form
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    client_id: '',
    project_id: '',
    responsible_id: '',
    contact_date: '',
    scheduled_date: '',
    visit_date: '',
    solution_date: '',
    contract_number: '',
    action_type_id: '',
    resolution_notes: '',
    generated_revenue: false,
    cost_value: '',
    sale_value: '',
  });

  // Close case form
  const [closeForm, setCloseForm] = useState({
    solution_date: format(new Date(), 'yyyy-MM-dd'),
    resolution_notes: '',
    generated_revenue: false,
    cost_value: '',
    sale_value: '',
  });

  // Update visit form
  const [updateForm, setUpdateForm] = useState({
    visit_date: '',
    attended_by: '',
  });

  // New client form
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
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
    // Validate new client fields if creating a new client
    if (isNewClient) {
      if (!newClient.name.trim()) {
        toast({ title: 'Informe o nome do cliente', variant: 'destructive' });
        return;
      }
    } else if (!newCase.client_id) {
      toast({ title: 'Selecione ou crie um cliente', variant: 'destructive' });
      return;
    }

    if (!newCase.title || !newCase.contact_date) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      let clientId = newCase.client_id;

      // Create new client if needed
      if (isNewClient && newClient.name.trim()) {
        const createdClient = await createClientMutation.mutateAsync({
          name: newClient.name.trim(),
          phone: newClient.phone.trim() || null,
          email: newClient.email.trim() || null,
          status: 'closed', // AT clients are typically post-sale
          created_by: currentTeamMember?.id || null,
        });
        
        if (createdClient?.id) {
          clientId = createdClient.id;
          toast({ title: `Cliente "${newClient.name}" criado` });
        } else {
          throw new Error('Failed to create client');
        }
      }

      await createMutation.mutateAsync({
        title: newCase.title,
        description: newCase.description || null,
        priority: newCase.priority,
        client_id: clientId,
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
      setIsNewClient(false);
      setNewClient({ name: '', phone: '', email: '' });
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
        attended_by: updateForm.attended_by || null,
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
      const costVal = safeParseFloat(closeForm.cost_value, { min: 0 });
      const saleVal = safeParseFloat(closeForm.sale_value, { min: 0 });
      
      await closeMutation.mutateAsync({
        id: selectedCase.id,
        solution_date: closeForm.solution_date,
        resolution_notes: closeForm.resolution_notes,
        generated_revenue: closeForm.generated_revenue || (saleVal !== null && saleVal > 0),
        cost_value: costVal,
        sale_value: saleVal,
      });

      toast({ title: 'Chamado encerrado com sucesso' });
      setShowCloseModal(false);
      setSelectedCase(null);
      setCloseForm({
        solution_date: format(new Date(), 'yyyy-MM-dd'),
        resolution_notes: '',
        generated_revenue: false,
        cost_value: '',
        sale_value: '',
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao encerrar chamado', variant: 'destructive' });
    }
  };

  const openViewModal = (atCase: TechnicalAssistance) => {
    setSelectedCase(atCase);
    setUpdateForm({ 
      visit_date: atCase.visit_date || '',
      attended_by: atCase.attended_by || '',
    });
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
      generated_revenue: false,
      cost_value: '',
      sale_value: '',
    });
    setShowCloseModal(true);
  };

  const openEditModal = (atCase: TechnicalAssistance) => {
    setSelectedCase(atCase);
    setEditForm({
      title: atCase.title || '',
      description: atCase.description || '',
      priority: atCase.priority || 'medium',
      client_id: atCase.client_id || '',
      project_id: atCase.project_id || '',
      responsible_id: atCase.responsible_id || '',
      contact_date: atCase.contact_date || '',
      scheduled_date: atCase.scheduled_date || '',
      visit_date: atCase.visit_date || '',
      solution_date: atCase.solution_date || '',
      contract_number: atCase.contract_number || '',
      action_type_id: atCase.action_type_id || '',
      resolution_notes: atCase.resolution_notes || '',
      generated_revenue: atCase.generated_revenue || false,
      cost_value: atCase.cost_value?.toString() || '',
      sale_value: atCase.sale_value?.toString() || '',
    });
    setShowEditModal(true);
  };

  const openDeleteDialog = (atCase: TechnicalAssistance) => {
    setSelectedCase(atCase);
    setShowDeleteDialog(true);
  };

  const handleEditCase = async () => {
    if (!selectedCase) return;
    
    if (!editForm.title.trim()) {
      toast({ title: 'O título é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      const costVal = editForm.cost_value ? parseFloat(editForm.cost_value) : null;
      const saleVal = editForm.sale_value ? parseFloat(editForm.sale_value) : null;
      const hasRevenue = (saleVal !== null && saleVal > 0) || editForm.generated_revenue;
      
      await updateMutation.mutateAsync({
        id: selectedCase.id,
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        priority: editForm.priority,
        client_id: editForm.client_id || null,
        project_id: editForm.project_id || null,
        responsible_id: editForm.responsible_id || null,
        contact_date: editForm.contact_date || null,
        scheduled_date: editForm.scheduled_date || null,
        visit_date: editForm.visit_date || null,
        contract_number: editForm.contract_number.trim() || null,
        action_type_id: editForm.action_type_id || null,
        resolution_notes: editForm.resolution_notes.trim() || null,
        generated_revenue: hasRevenue,
        cost_value: costVal,
        sale_value: saleVal,
      });

      toast({ title: 'Chamado atualizado com sucesso' });
      setShowEditModal(false);
      setSelectedCase(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao atualizar chamado', variant: 'destructive' });
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedCase) return;

    try {
      await deleteMutation.mutateAsync(selectedCase.id);
      toast({ title: 'Chamado excluído com sucesso' });
      setShowDeleteDialog(false);
      setSelectedCase(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao excluir chamado', variant: 'destructive' });
    }
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

  const { exportToFile } = useExportData();

  const handleExportAT = (exportFormat: 'xlsx' | 'csv') => {
    const priorityLabels: Record<string, string> = { high: 'Alta', medium: 'Média', low: 'Baixa' };
    
    if (viewTab === 'open') {
      const columns: ExportColumn<typeof openCases[0]>[] = [
        { key: 'title', header: 'Título' },
        { key: 'client_name', header: 'Cliente' },
        { key: 'contract_number', header: 'Contrato' },
        { key: 'priority', header: 'Prioridade', formatter: (v) => priorityLabels[v as string] || String(v) },
        { key: 'contact_date', header: 'Data Contato', formatter: (v) => v ? format(parseISO(v as string), 'dd/MM/yyyy') : '' },
        { key: 'visit_date', header: 'Data Visita', formatter: (v) => v ? format(parseISO(v as string), 'dd/MM/yyyy') : 'Pendente' },
        { key: 'action_type_name', header: 'Tipo' },
        { key: 'description', header: 'Descrição' },
      ];
      
      if (openCases.length === 0) {
        toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
        return;
      }
      
      const success = exportToFile(openCases, columns, { filename: 'at_chamados_abertos', format: exportFormat });
      if (success) toast({ title: `Dados exportados com sucesso (${exportFormat.toUpperCase()})` });
      
    } else {
      const columns: ExportColumn<typeof closedCases[0]>[] = [
        { key: 'title', header: 'Título' },
        { key: 'client_name', header: 'Cliente' },
        { key: 'contract_number', header: 'Contrato' },
        { key: 'priority', header: 'Prioridade', formatter: (v) => priorityLabels[v as string] || String(v) },
        { key: 'contact_date', header: 'Data Contato', formatter: (v) => v ? format(parseISO(v as string), 'dd/MM/yyyy') : '' },
        { key: 'visit_date', header: 'Data Visita', formatter: (v) => v ? format(parseISO(v as string), 'dd/MM/yyyy') : '' },
        { key: 'solution_date', header: 'Data Solução', formatter: (v) => v ? format(parseISO(v as string), 'dd/MM/yyyy') : '' },
        { key: 'cost_value', header: 'Custo (R$)', formatter: (v) => v ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' },
        { key: 'sale_value', header: 'Venda (R$)', formatter: (v) => v ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' },
        { key: 'generated_revenue', header: 'Gerou Caixa', formatter: (v) => v === true ? 'Sim' : 'Não' },
        { key: 'resolution_notes', header: 'Resolução' },
      ];
      
      if (closedCases.length === 0) {
        toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
        return;
      }
      
      const success = exportToFile(closedCases, columns, { filename: 'at_chamados_encerrados', format: exportFormat });
      if (success) toast({ title: `Dados exportados com sucesso (${exportFormat.toUpperCase()})` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
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
          <button
            onClick={() => setViewTab('dashboard')}
            className={`px-4 py-2 text-xs uppercase tracking-widest border flex items-center gap-1.5 ${
              viewTab === 'dashboard' ? 'bg-foreground text-background' : 'border-border'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard
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
                onClick={() => handleExportAT('xlsx')}
                className="px-4 py-2 text-xs text-left hover:bg-muted transition-colors"
              >
                Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExportAT('csv')}
                className="px-4 py-2 text-xs text-left hover:bg-muted transition-colors"
              >
                CSV (.csv)
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary bg-foreground text-background flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Chamado AT
          </button>
        </div>
      </div>

      {/* Dashboard */}
      {viewTab === 'dashboard' && <ATDashboard />}

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
                        <ClienteHistoryButton clientId={atCase.client_id} variant="compact" />
                        <button
                          onClick={() => openEditModal(atCase)}
                          className="btn-secondary border-border text-xs px-2 py-1.5"
                          title="Editar"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(atCase)}
                          className="btn-secondary border-destructive text-destructive text-xs px-2 py-1.5"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
                    <th className="text-left p-2 font-medium uppercase tracking-widest text-foreground">Título</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest text-foreground">Cliente</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest text-foreground">Contato</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest text-foreground">Solução</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest text-foreground">Dias</th>
                    <th className="text-right p-2 font-medium uppercase tracking-widest text-foreground">Custo</th>
                    <th className="text-right p-2 font-medium uppercase tracking-widest text-foreground">Venda</th>
                    <th className="text-right p-2 font-medium uppercase tracking-widest text-foreground">Lucro</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest text-foreground">Caixa</th>
                    <th className="text-left p-2 font-medium uppercase tracking-widest text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {closedCases.map((atCase) => {
                    const totalDays = atCase.contact_date && atCase.solution_date
                      ? differenceInDays(parseISO(atCase.solution_date), parseISO(atCase.contact_date))
                      : 0;
                    const costVal = atCase.cost_value ?? 0;
                    const saleVal = atCase.sale_value ?? 0;
                    const profit = saleVal - costVal;
                    
                    return (
                      <tr key={atCase.id} className="border-b border-border/50">
                        <td className="p-2 text-foreground">{atCase.title}</td>
                        <td className="p-2 text-foreground">{atCase.client_name || 'N/A'}</td>
                        <td className="p-2 text-foreground">
                          {atCase.contact_date 
                            ? format(parseISO(atCase.contact_date), "dd/MM/yy", { locale: ptBR })
                            : '-'
                          }
                        </td>
                        <td className="p-2 text-foreground">
                          {atCase.solution_date 
                            ? format(parseISO(atCase.solution_date), "dd/MM/yy", { locale: ptBR })
                            : '-'
                          }
                        </td>
                        <td className="p-2">
                          <span className={totalDays > 30 ? 'text-destructive' : 'text-foreground'}>
                            {totalDays}d
                          </span>
                        </td>
                        <td className="p-2 text-right text-foreground">
                          {costVal > 0 ? `R$ ${costVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="p-2 text-right text-foreground">
                          {saleVal > 0 ? `R$ ${saleVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className={`p-2 text-right font-medium ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {(saleVal > 0 || costVal > 0) ? `R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="p-2">
                          {atCase.generated_revenue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success rounded text-xs font-medium">
                              <Check className="w-3 h-3" />
                              Sim
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <ClienteHistoryButton clientId={atCase.client_id} variant="icon" className="text-muted-foreground" />
                            <button
                              onClick={() => openEditModal(atCase)}
                              className="p-1 hover:bg-muted rounded"
                              title="Editar"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(atCase)}
                              className="p-1 hover:bg-muted rounded text-destructive"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
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

            {/* Client Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Cliente *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewClient(!isNewClient);
                    if (!isNewClient) {
                      setNewCase({ ...newCase, client_id: '' });
                    } else {
                      setNewClient({ name: '', phone: '', email: '' });
                    }
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <UserPlus className="w-3 h-3" />
                  {isNewClient ? 'Selecionar existente' : 'Novo cliente'}
                </button>
              </div>

              {isNewClient ? (
                <div className="space-y-3 p-3 border border-primary/30 bg-primary/5 rounded">
                  <div>
                    <label className="text-xs text-muted-foreground">Nome *</label>
                    <input
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="Nome do cliente"
                      className="input-flat w-full mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Telefone</label>
                      <input
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="input-flat w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">E-mail</label>
                      <input
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        placeholder="email@exemplo.com"
                        className="input-flat w-full mt-1"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  value={newCase.client_id}
                  onChange={(e) => setNewCase({ ...newCase, client_id: e.target.value })}
                  className="input-flat w-full"
                >
                  <option value="">Selecione</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Registrar Visita Técnica
                  </label>
                  
                  <div>
                    <label className="text-xs text-muted-foreground">Data da Visita *</label>
                    <input
                      type="date"
                      value={updateForm.visit_date}
                      onChange={(e) => setUpdateForm({ ...updateForm, visit_date: e.target.value })}
                      className="input-flat w-full mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground">Profissional que Atendeu</label>
                    <select
                      value={updateForm.attended_by}
                      onChange={(e) => setUpdateForm({ ...updateForm, attended_by: e.target.value })}
                      className="input-flat w-full mt-1"
                    >
                      <option value="">Selecione</option>
                      {activeTeamMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={handleUpdateVisitDate}
                    className="btn-primary bg-foreground text-background w-full"
                  >
                    Registrar Visita
                  </button>
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

            {/* Financial Fields */}
            <div className="space-y-3 p-3 border border-border bg-muted/20 rounded">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Dados Financeiros
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Valor de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closeForm.cost_value}
                    onChange={(e) => setCloseForm({ ...closeForm, cost_value: e.target.value })}
                    placeholder="0,00"
                    className="input-flat w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Valor de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closeForm.sale_value}
                    onChange={(e) => setCloseForm({ ...closeForm, sale_value: e.target.value })}
                    placeholder="0,00"
                    className="input-flat w-full mt-1"
                  />
                </div>
              </div>
              {/* Calculated Profit */}
              {(closeForm.cost_value || closeForm.sale_value) && (
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Lucro Calculado:</span>
                    <span className={`text-sm font-bold ${
                      (parseFloat(closeForm.sale_value || '0') - parseFloat(closeForm.cost_value || '0')) >= 0 
                        ? 'text-success' 
                        : 'text-destructive'
                    }`}>
                      R$ {((parseFloat(closeForm.sale_value || '0') - parseFloat(closeForm.cost_value || '0'))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Generated Revenue Checkbox */}
            <div className="p-3 border border-success/30 bg-success/5 rounded">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={closeForm.generated_revenue || (parseFloat(closeForm.sale_value || '0') > 0)}
                  onChange={(e) => setCloseForm({ ...closeForm, generated_revenue: e.target.checked })}
                  className="w-4 h-4 accent-success"
                  disabled={parseFloat(closeForm.sale_value || '0') > 0}
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Gerou Caixa</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {parseFloat(closeForm.sale_value || '0') > 0 
                      ? 'Marcado automaticamente pois há valor de venda' 
                      : 'Marque se esta assistência técnica gerou receita para a empresa'}
                  </p>
                </div>
              </label>
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

      {/* Edit Case Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest">
              Editar Chamado de AT
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Título *
              </label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="input-flat w-full mt-1"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Cliente
              </label>
              <select
                value={editForm.client_id}
                onChange={(e) => setEditForm({ ...editForm, client_id: e.target.value })}
                className="input-flat w-full mt-1"
              >
                <option value="">Selecione</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Prioridade
                </label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="input-flat w-full mt-1"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>

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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Data do Contato
                </label>
                <input
                  type="date"
                  value={editForm.contact_date}
                  onChange={(e) => setEditForm({ ...editForm, contact_date: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Data da Visita
                </label>
                <input
                  type="date"
                  value={editForm.visit_date}
                  onChange={(e) => setEditForm({ ...editForm, visit_date: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Projeto
                </label>
                <select
                  value={editForm.project_id}
                  onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })}
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
                  value={editForm.contract_number}
                  onChange={(e) => setEditForm({ ...editForm, contract_number: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Responsável
              </label>
              <select
                value={editForm.responsible_id}
                onChange={(e) => setEditForm({ ...editForm, responsible_id: e.target.value })}
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
                Descrição
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="input-flat w-full mt-1 h-20 resize-none"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Notas de Resolução
              </label>
              <textarea
                value={editForm.resolution_notes}
                onChange={(e) => setEditForm({ ...editForm, resolution_notes: e.target.value })}
                className="input-flat w-full mt-1 h-20 resize-none"
              />
            </div>

            {/* Financial Fields in Edit Modal */}
            <div className="space-y-3 p-3 border border-border bg-muted/20 rounded">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Dados Financeiros
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Valor de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.cost_value}
                    onChange={(e) => setEditForm({ ...editForm, cost_value: e.target.value })}
                    placeholder="0,00"
                    className="input-flat w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Valor de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.sale_value}
                    onChange={(e) => setEditForm({ ...editForm, sale_value: e.target.value })}
                    placeholder="0,00"
                    className="input-flat w-full mt-1"
                  />
                </div>
              </div>
              {/* Calculated Profit */}
              {(editForm.cost_value || editForm.sale_value) && (
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Lucro Calculado:</span>
                    <span className={`text-sm font-bold ${
                      (parseFloat(editForm.sale_value || '0') - parseFloat(editForm.cost_value || '0')) >= 0 
                        ? 'text-success' 
                        : 'text-destructive'
                    }`}>
                      R$ {((parseFloat(editForm.sale_value || '0') - parseFloat(editForm.cost_value || '0'))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Generated Revenue Checkbox in Edit Modal */}
            <div className="p-3 border border-success/30 bg-success/5 rounded">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.generated_revenue || (parseFloat(editForm.sale_value || '0') > 0)}
                  onChange={(e) => setEditForm({ ...editForm, generated_revenue: e.target.checked })}
                  className="w-4 h-4 accent-success"
                  disabled={parseFloat(editForm.sale_value || '0') > 0}
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Gerou Caixa</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {parseFloat(editForm.sale_value || '0') > 0 
                      ? 'Marcado automaticamente pois há valor de venda' 
                      : 'Marque se esta assistência técnica gerou receita'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleEditCase}
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
            <AlertDialogTitle>Excluir Chamado de AT</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o chamado "{selectedCase?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCase}
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
