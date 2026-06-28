import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, FileText, Calendar, TrendingUp, Filter, User, DollarSign, ListChecks, Pencil, Trash2, ChevronDown, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjects, Project } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useApp } from '@/contexts/AppContext';
import { ContractChecklistView } from './ContractChecklistView';
import { DeleteContractDialog } from './DeleteContractDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import ClienteHistoryButton from '@/components/ClienteHistoryButton';

type PeriodFilter = 'all' | 'month' | 'year' | 'custom';

export default function ContratosTab() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const { teamMembers, professionals, actions, actionTypes } = useApp();
  const { data: currentTeamMember } = useCurrentTeamMember();
  
  const queryClient = useQueryClient();
  
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [consultantIds, setConsultantIds] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editContractNumber, setEditContractNumber] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteProjectName, setDeleteProjectName] = useState('');

  // Get only closed projects (closed_won stage)
  const closedProjects = useMemo(() => {
    return projects.filter(p => p.stage === 'closed_won');
  }, [projects]);

  // Filter by period + consultant
  const filteredProjects = useMemo(() => {
    let list = closedProjects;
    if (periodFilter !== 'all') {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;
      if (periodFilter === 'month') { start = startOfMonth(now); end = endOfMonth(now); }
      else if (periodFilter === 'year') { start = startOfYear(now); end = endOfYear(now); }
      else if (periodFilter === 'custom' && customStart && customEnd) {
        start = parseISO(customStart); end = parseISO(customEnd);
      }
      if (start && end) {
        list = list.filter(p => {
          if (!p.closed_date) return false;
          try { return isWithinInterval(parseISO(p.closed_date), { start: start!, end: end! }); }
          catch { return false; }
        });
      }
    }
    if (consultantIds.length > 0) {
      list = list.filter(p => p.responsible_id && consultantIds.includes(p.responsible_id));
    }
    return list;
  }, [closedProjects, periodFilter, customStart, customEnd, consultantIds]);

  // Count number of "Apresentação de Projeto" actions per project (used to show conversion effort)
  const presentationCountByProject = useMemo(() => {
    const map: Record<string, number> = {};
    actions.forEach(a => {
      const t = actionTypes.find(at => at.id === a.actionTypeId);
      const name = (t?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (!a.projectId) return;
      if (name.startsWith('apresentacao de projeto') && !name.includes('reforma')) {
        map[a.projectId] = (map[a.projectId] || 0) + 1;
      }
    });
    return map;
  }, [actions, actionTypes]);

  // Calculate totals
  const totalValue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (p.closed_value || p.estimated_value || 0), 0);
  }, [filteredProjects]);

  // Get sale action (to retrieve contract number)
  const getSaleAction = (projectId: string) => {
    return actions.find(a => {
      const actionType = actionTypes.find(t => t.id === a.actionTypeId);
      return a.projectId === projectId && actionType?.classification === 'venda';
    });
  };

  // Get all actions for a project
  const getProjectActions = (projectId: string) => {
    return actions.filter(a => a.projectId === projectId);
  };

  // Get client for project
  const getClientForProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project?.client_id) return null;
    return clients.find(c => c.id === project.client_id);
  };

  const getResponsibleName = (id?: string | null) => {
    if (!id) return '-';
    return teamMembers.find(m => m.id === id)?.name || '-';
  };

  const getProfessionalName = (id?: string | null) => {
    if (!id) return '-';
    return professionals.find(p => p.id === id)?.name || '-';
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setViewModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    const client = getClientForProject(project.id);
    const saleAction = getSaleAction(project.id);
    setEditingProject(project);
    setEditContractNumber(client?.contract_number || saleAction?.presentationNumber || '');
    setEditClientName(project.clients?.name || client?.name || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    if (!editClientName.trim()) {
      toast.error('O nome do cliente é obrigatório');
      return;
    }
    setSaving(true);
    try {
      let clientId = editingProject.client_id;
      if (clientId) {
        const { error } = await supabase
          .from('clients')
          .update({ contract_number: editContractNumber.trim() || null, name: editClientName.trim() })
          .eq('id', clientId);
        if (error) throw error;
      } else {
        // Create a new client and link to the project
        const { data: newClient, error: createError } = await supabase
          .from('clients')
          .insert({ name: editClientName.trim(), contract_number: editContractNumber.trim() || null, status: 'active', created_by: currentTeamMember?.id || null })
          .select('id')
          .single();
        if (createError) throw createError;
        clientId = newClient.id;
        // Link client to project
        const { error: linkError } = await supabase
          .from('projects')
          .update({ client_id: clientId })
          .eq('id', editingProject.id);
        if (linkError) throw linkError;
      }
      setEditModalOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['projects'] }),
        queryClient.refetchQueries({ queryKey: ['clients'] }),
      ]);
      toast.success('Contrato atualizado com sucesso');
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Carregando contratos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="text-xs text-muted-foreground bg-muted/50 px-4 py-3 border border-border">
        <span className="font-medium">Contratos são gerados automaticamente</span> quando uma ação de "Venda" é registrada com o número do contrato.
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">Contratos Fechados</span>
          </div>
          <p className="text-2xl font-light">{filteredProjects.length}</p>
        </div>
        <div className="border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">Valor Total</span>
          </div>
          <p className="text-2xl font-light">{formatCurrency(totalValue)}</p>
        </div>
        <div className="border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">Ticket Médio</span>
          </div>
          <p className="text-2xl font-light">
            {filteredProjects.length > 0 ? formatCurrency(totalValue / filteredProjects.length) : '-'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 border border-border p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Período:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPeriodFilter('month')}
            className={`px-3 py-1 text-xs tracking-widest uppercase border ${
              periodFilter === 'month' ? 'bg-foreground text-background' : 'border-border hover:bg-muted'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodFilter('year')}
            className={`px-3 py-1 text-xs tracking-widest uppercase border ${
              periodFilter === 'year' ? 'bg-foreground text-background' : 'border-border hover:bg-muted'
            }`}
          >
            Este Ano
          </button>
          <button
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1 text-xs tracking-widest uppercase border ${
              periodFilter === 'all' ? 'bg-foreground text-background' : 'border-border hover:bg-muted'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setPeriodFilter('custom')}
            className={`px-3 py-1 text-xs tracking-widest uppercase border ${
              periodFilter === 'custom' ? 'bg-foreground text-background' : 'border-border hover:bg-muted'
            }`}
          >
            Personalizado
          </button>
        </div>
        {periodFilter === 'custom' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="input-flat text-sm"
            />
            <span className="text-muted-foreground">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="input-flat text-sm"
            />
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Consultores:</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="input-flat text-sm flex items-center gap-2 min-w-[180px] justify-between">
                <span className="truncate">
                  {consultantIds.length === 0
                    ? 'Todos'
                    : `${consultantIds.length} selecionado${consultantIds.length > 1 ? 's' : ''}`}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-popover" align="end">
              <div className="flex items-center justify-between mb-2 px-2 pt-1">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Vendedores</span>
                {consultantIds.length > 0 && (
                  <button
                    onClick={() => setConsultantIds([])}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Limpar
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {teamMembers.filter(m => m.active).map(m => {
                  const checked = consultantIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setConsultantIds((prev) =>
                            v ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                          );
                        }}
                      />
                      <span className="truncate">{m.name}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Contracts List (analysis cards) */}
      {filteredProjects.length === 0 ? (
        <div className="border border-border p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum contrato fechado no período selecionado</p>
          <p className="text-xs text-muted-foreground mt-2">
            Os contratos são gerados automaticamente quando uma Venda é registrada em +Registro de Ações
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const client = getClientForProject(project.id);
            const clientName = project.clients?.name || client?.name || 'Cliente sem nome';
            const value = project.closed_value || project.estimated_value || 0;
            const presCount = presentationCountByProject[project.id] || 0;
            const projetistaApres = teamMembers.find(m => m.id === project.apresentacao_projetista_id);
            const profName = project.professionals?.name || '—';
            const saleAction = getSaleAction(project.id);
            const saleConsultantId = (saleAction as any)?.consultantId || (saleAction as any)?.consultant_id;
            const consultantName =
              (saleConsultantId && teamMembers.find(m => m.id === saleConsultantId)?.name) ||
              project.responsible?.name || '—';

            return (
              <div key={project.id} className="border border-border p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      <span className="font-medium">{clientName}</span>
                      {' fechou o contrato no valor de '}
                      <span className="font-semibold text-green-600">{formatCurrency(value)}</span>
                      {'. '}
                      {presCount > 0 ? (
                        <>
                          {'Foram necessárias '}
                          <span className="font-semibold">{presCount}</span>
                          {presCount === 1 ? ' apresentação ' : ' apresentações '}
                          para convertê-lo(a).
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">Sem apresentações registradas antes da venda.</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span><span className="uppercase tracking-wider">Consultor:</span> <span className="text-foreground">{consultantName}</span></span>
                      <span><span className="uppercase tracking-wider">Arquiteto:</span> <span className="text-foreground">{profName}</span></span>
                      <span><span className="uppercase tracking-wider">Projetista Apres.:</span> <span className="text-foreground">{projetistaApres?.name || '—'}</span></span>
                      <span><span className="uppercase tracking-wider">FOCCO:</span> <span className="text-foreground font-mono">{project.focco_project_number || '—'}</span></span>
                      {project.closed_date && (
                        <span><span className="uppercase tracking-wider">Data:</span> <span className="text-foreground">{format(parseISO(project.closed_date), 'dd/MM/yyyy', { locale: ptBR })}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <ClienteHistoryButton clientId={project.client_id} variant="compact" className="mr-1" />
                    <button
                      onClick={() => handleEditProject(project)}
                      className="p-2 hover:bg-muted rounded"
                      title="Editar contrato"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleViewProject(project)}
                      className="p-2 hover:bg-muted rounded"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteProjectId(project.id);
                        setDeleteProjectName(project.name || project.focco_project_number || 'Sem nome');
                      }}
                      className="p-2 hover:bg-destructive/10 rounded text-destructive/70 hover:text-destructive"
                      title="Excluir contrato"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Project Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="bg-neutral-800 text-white border-neutral-600 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white font-semibold">
              <FileText className="h-5 w-5" />
              Contrato: {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProject && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-neutral-700 border border-neutral-600">
                <TabsTrigger value="info" className="text-xs font-semibold text-neutral-300 data-[state=active]:bg-white data-[state=active]:text-neutral-900">
                  <FileText className="h-4 w-4 mr-1" />
                  Informações
                </TabsTrigger>
                <TabsTrigger value="checklist" className="text-xs font-semibold text-neutral-300 data-[state=active]:bg-white data-[state=active]:text-neutral-900">
                  <ListChecks className="h-4 w-4 mr-1" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs font-semibold text-neutral-300 data-[state=active]:bg-white data-[state=active]:text-neutral-900">
                  <Calendar className="h-4 w-4 mr-1" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              {/* Info Tab */}
              <TabsContent value="info" className="space-y-6 py-4">
                {/* Contract Info */}
                {(() => {
                  const client = getClientForProject(selectedProject.id);
                  const saleAction = getSaleAction(selectedProject.id);
                  const contractNumber = client?.contract_number || saleAction?.presentationNumber;
                  
                  return contractNumber ? (
                    <div className="bg-green-900/50 border border-green-600 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-400" />
                        <span className="text-xs tracking-widest uppercase text-green-300 font-medium">Número do Contrato</span>
                      </div>
                      <p className="text-2xl font-mono font-bold text-green-300 mt-1">{contractNumber}</p>
                    </div>
                  ) : null;
                })()}

                {/* Project Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-1">Nº FOCCO</span>
                    <p className="font-mono text-white font-semibold">{selectedProject.focco_project_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-1">Data Fechamento</span>
                    <p className="text-white font-medium">
                      {selectedProject.closed_date 
                        ? format(parseISO(selectedProject.closed_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-1">Cliente</span>
                    <p className="text-white font-medium">{selectedProject.clients?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-1">Profissional</span>
                    <p className="text-white font-medium">{selectedProject.professionals?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-1">Consultor Responsável</span>
                    <p className="text-white font-medium">{selectedProject.responsible?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-1">Valor Fechado</span>
                    <p className="text-lg font-bold text-white">
                      {formatCurrency(selectedProject.closed_value || selectedProject.estimated_value)}
                    </p>
                  </div>
                </div>

                {selectedProject.notes && (
                  <div>
                    <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-1">Observações</span>
                    <p className="text-sm text-neutral-200 bg-neutral-700 p-2 rounded border border-neutral-600">{selectedProject.notes}</p>
                  </div>
                )}
              </TabsContent>

              {/* Checklist Tab */}
              <TabsContent value="checklist" className="py-4">
                <ContractChecklistView projectId={selectedProject.id} />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="py-4">
                <span className="text-xs tracking-widest uppercase text-neutral-400 font-medium block mb-3">
                  Histórico de Ações Vinculadas
                </span>
                <div className="border border-neutral-600 rounded-lg">
                  {getProjectActions(selectedProject.id).length === 0 ? (
                    <p className="p-4 text-sm text-neutral-400 text-center">
                      Nenhuma ação vinculada a este projeto
                    </p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-600 bg-neutral-700">
                          <th className="text-left p-2 text-xs tracking-widest uppercase text-neutral-300 font-semibold">Data</th>
                          <th className="text-left p-2 text-xs tracking-widest uppercase text-neutral-300 font-semibold">Tipo</th>
                          <th className="text-left p-2 text-xs tracking-widest uppercase text-neutral-300 font-semibold">Consultor</th>
                          <th className="text-right p-2 text-xs tracking-widest uppercase text-neutral-300 font-semibold">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getProjectActions(selectedProject.id).map((action) => {
                          const actionType = actionTypes.find(t => t.id === action.actionTypeId);
                          return (
                            <tr key={action.id} className="border-b border-neutral-700">
                              <td className="p-2 text-sm text-white font-medium">
                                {format(parseISO(action.date), 'dd/MM/yyyy', { locale: ptBR })}
                              </td>
                              <td className="p-2 text-sm">
                                <span className={`px-2 py-0.5 text-xs rounded font-semibold ${
                                  actionType?.classification === 'venda' 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-neutral-600 text-white'
                                }`}>
                                  {actionType?.name || '-'}
                                </span>
                              </td>
                              <td className="p-2 text-sm text-white font-medium">{getResponsibleName(action.consultantId)}</td>
                              <td className="p-2 text-sm text-right text-white font-semibold">
                                {action.value ? formatCurrency(action.value) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Contract Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">Nº Contrato</Label>
              <Input
                value={editContractNumber}
                onChange={(e) => setEditContractNumber(e.target.value)}
                placeholder="Número do contrato"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">Nome do Cliente</Label>
              <Input
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                placeholder="Nome do cliente"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-sm border border-border hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editClientName.trim()}
                className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Contract Dialog */}
      <DeleteContractDialog
        open={!!deleteProjectId}
        onOpenChange={(open) => { if (!open) setDeleteProjectId(null); }}
        projectId={deleteProjectId}
        projectName={deleteProjectName}
      />
    </div>
  );
}
