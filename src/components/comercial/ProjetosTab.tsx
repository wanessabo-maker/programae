import { useState, useMemo } from 'react';
import { Search, Folder, Edit2, Trash2, XCircle, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProjects, useUpdateProject, useDeleteProject, PROJECT_STAGES, Project } from '@/hooks/useProjects';
import { useClients, useUpdateClient } from '@/hooks/useClients';
import { useProfessionals, useTeamMembers } from '@/hooks/useDatabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface ProjectFormData {
  name: string;
  description: string;
  stage: string;
  estimated_value: string;
  closed_value: string;
  start_date: string;
  expected_delivery: string;
  notes: string;
  client_id: string;
  professional_id: string;
  responsible_id: string;
  apresentacao_projetista_id: string;
}

interface PresentationActionRow {
  id: string;
  project_id: string | null;
  focco_project_number: string | null;
  action_date: string;
  value: number | null;
  action_types: {
    classification: string;
    name: string;
  } | null;
}

interface ValueHistoryRow {
  project_id: string;
  presented_value: number;
  created_at: string;
}

const emptyForm: ProjectFormData = {
  name: '',
  description: '',
  stage: 'em_negociacao',
  estimated_value: '',
  closed_value: '',
  start_date: '',
  expected_delivery: '',
  notes: '',
  client_id: '',
  professional_id: '',
  responsible_id: '',
  apresentacao_projetista_id: '',
};

const normalizeText = (value: string | null | undefined) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// "Apresentação de Projeto" (ação Comercial, gera valor R$) é diferente de "Projeto de Apresentação" (ação de Projetos, sem valor R$ — não entra na carteira).
// Identificamos exclusivamente o tipo Comercial: nome começa com "Apresentação de Projeto".
const isProjectPresentationAction = (action: PresentationActionRow) => {
  const actionName = normalizeText(action.action_types?.name);
  // Exclui "Projeto de Apresentação" (área Projetos) e variações de Reforma
  if (actionName.includes('reforma')) return false;
  // Aceita apenas "Apresentação de Projeto" / "Apresentação de Projetos"
  return actionName.startsWith('apresentacao de projeto');
};

// Carteira Flutuante: somente Em Negociação (não vendidos nem perdidos)
const ACTIVE_STAGES = PROJECT_STAGES.filter(s => s.id === 'em_negociacao');

export default function ProjetosTab() {
  const [showModal, setShowModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToLose, setProjectToLose] = useState<Project | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'year' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');

  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: professionals = [] } = useProfessionals();
  const { data: teamMembers = [] } = useTeamMembers();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const updateClient = useUpdateClient();
  const queryClient = useQueryClient();

  const activeTeamMembers = teamMembers.filter(m => m.active);

  // Fetch all presentation-related actions; filtering is finalized in the client to also cover misclassified records
  const { data: presentationActions = [] } = useQuery<PresentationActionRow[]>({
    queryKey: ['carteira-flutuante-presentations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actions')
        .select('id, project_id, focco_project_number, action_date, value, action_types(classification, name)')
        .order('action_date', { ascending: false });
      if (error) throw error;
      return (data || []).filter(isProjectPresentationAction) as PresentationActionRow[];
    },
  });

  // Fetch project value history (to retrieve latest presented value)
  const { data: valueHistory = [] } = useQuery<ValueHistoryRow[]>({
    queryKey: ['carteira-flutuante-value-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_value_history')
        .select('project_id, presented_value, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ValueHistoryRow[];
    },
  });

  // Build map: project_id -> { lastPresentationDate, lastPresentedValue }
  const presentationMap = useMemo(() => {
    const map: Record<string, { lastPresentationDate: string; lastPresentedValue: number | null; count: number }> = {};

    // Index latest presentation date per project (by project_id OR focco_project_number)
    presentationActions.forEach((a) => {
      const project = projects.find((p) =>
        (a.project_id && p.id === a.project_id) ||
        (a.focco_project_number && p.focco_project_number === a.focco_project_number)
      );

      if (!project) return;

      const existing = map[project.id];
      if (!existing) {
        map[project.id] = {
          lastPresentationDate: a.action_date,
          lastPresentedValue: null,
          count: 1,
        };
      } else {
        existing.count += 1;
        if (a.action_date > existing.lastPresentationDate) {
          existing.lastPresentationDate = a.action_date;
        }
      }
    });

    // Index latest presented value per project (history is ordered desc)
    valueHistory.forEach((h) => {
      if (!map[h.project_id]) {
        const project = projects.find((p) => p.id === h.project_id);
        map[h.project_id] = {
          lastPresentationDate: project?.start_date || project?.created_at || '',
          lastPresentedValue: h.presented_value,
          count: 0,
        };
      } else if (map[h.project_id].lastPresentedValue === null) {
        map[h.project_id].lastPresentedValue = h.presented_value;
      }
    });

    return map;
  }, [presentationActions, valueHistory, projects]);

  // Carteira Flutuante: projetos em_negociacao com pelo menos uma Apresentação de Projeto registrada
  const carteiraFlutuanteProjects = useMemo(() => {
    return projects
      .filter((p) => p.stage === 'em_negociacao' && presentationMap[p.id])
      .map((p) => ({
        ...p,
        lastPresentationDate: presentationMap[p.id]?.lastPresentationDate || p.start_date || p.created_at || '',
        lastPresentedValue: presentationMap[p.id]?.lastPresentedValue ?? p.estimated_value ?? null,
        presentationCount: presentationMap[p.id]?.count ?? 0,
      }))
      .sort((a, b) => (b.lastPresentationDate || '').localeCompare(a.lastPresentationDate || ''));
  }, [projects, presentationMap]);

  const filteredProjects = useMemo(() => {
    let list = carteiraFlutuanteProjects;

    // Period filter (by lastPresentationDate)
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
          if (!p.lastPresentationDate) return false;
          try { return isWithinInterval(parseISO(p.lastPresentationDate), { start: start!, end: end! }); }
          catch { return false; }
        });
      }
    }

    // Consultant filter
    if (consultantFilter !== 'all') {
      list = list.filter(p => p.responsible_id === consultantFilter);
    }

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(project =>
        project.name.toLowerCase().includes(term) ||
        project.clients?.name?.toLowerCase().includes(term) ||
        project.focco_project_number?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [carteiraFlutuanteProjects, searchTerm, periodFilter, customStart, customEnd, consultantFilter]);

  const getDisplayedProjectValue = (project: Project & { lastPresentedValue?: number | null }) =>
    project.lastPresentedValue ?? project.estimated_value ?? null;

  const handleEdit = (project: Project & { lastPresentedValue?: number | null }) => {
    const displayedValue = getDisplayedProjectValue(project);
    setForm({
      name: project.name,
      description: project.description || '',
      stage: project.stage || 'lead',
      estimated_value: displayedValue?.toString() || '',
      closed_value: project.closed_value?.toString() || '',
      start_date: project.start_date || '',
      expected_delivery: project.expected_delivery || '',
      notes: project.notes || '',
      client_id: project.client_id || '',
      professional_id: project.professional_id || '',
      responsible_id: project.responsible_id || '',
      apresentacao_projetista_id: project.apresentacao_projetista_id || '',
    });
    setEditingProject(project);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const projectData = {
      name: form.name,
      description: form.description || null,
      stage: form.stage,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      closed_value: form.closed_value ? parseFloat(form.closed_value) : null,
      start_date: form.start_date || null,
      expected_delivery: form.expected_delivery || null,
      notes: form.notes || null,
      client_id: form.client_id || null,
      professional_id: form.professional_id || null,
      responsible_id: form.responsible_id || null,
      apresentacao_projetista_id: form.apresentacao_projetista_id || null,
    };

    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, ...projectData });
        // A Carteira Flutuante exibe o último valor em project_value_history.
        // Por isso o lápis precisa comparar/gravar contra o valor exibido na tabela, não só contra projects.estimated_value.
        const prevValue = getDisplayedProjectValue(editingProject);
        const newValue = projectData.estimated_value;
        if (newValue !== null && newValue !== prevValue) {
          const { data: authData } = await supabase.auth.getUser();
          const { data: me } = await supabase
            .from('team_members')
            .select('id')
            .eq('user_id', authData.user?.id)
            .maybeSingle();

          const consultantId = me?.id || projectData.responsible_id || editingProject.responsible_id;
          if (!consultantId) {
            throw new Error('Não foi possível identificar o consultor para registrar o histórico de valor.');
          }

          const { error: historyError } = await supabase.from('project_value_history').insert({
            project_id: editingProject.id,
            presented_value: newValue,
            consultant_id: consultantId,
            notes: 'Ajuste manual na Carteira Flutuante',
          });

          if (historyError) {
            throw historyError;
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
        await queryClient.invalidateQueries({ queryKey: ['carteira-flutuante-value-history'] });
        await queryClient.invalidateQueries({ queryKey: ['carteira-flutuante-presentations'] });
        toast.success('Projeto atualizado com sucesso');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingProject(null);
    } catch (error) {
      toast.error('Erro ao salvar projeto');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      try {
        await deleteProject.mutateAsync(id);
        toast.success('Projeto excluído');
      } catch (error) {
        toast.error('Erro ao excluir projeto');
      }
    }
  };

  // Mark project as lost
  const handleOpenLostModal = (project: Project) => {
    setProjectToLose(project);
    setLostReason('');
    setShowLostModal(true);
  };

  const handleMarkAsLost = async () => {
    if (!projectToLose) return;

    try {
      // Update project stage to closed_lost
      await updateProject.mutateAsync({
        id: projectToLose.id,
        stage: 'closed_lost',
        closed_date: new Date().toISOString().split('T')[0],
        notes: projectToLose.notes 
          ? `${projectToLose.notes}\n\nMotivo da perda: ${lostReason}`
          : `Motivo da perda: ${lostReason}`,
      });

      // Update client status to lost if exists
      if (projectToLose.client_id) {
        await updateClient.mutateAsync({
          id: projectToLose.client_id,
          status: 'lost',
        });
      }

      toast.success('Projeto marcado como perdido');
      setShowLostModal(false);
      setProjectToLose(null);
      setLostReason('');
    } catch (error) {
      console.error('Error marking project as lost:', error);
      toast.error('Erro ao marcar projeto como perdido');
    }
  };

  const handleMoveStage = async (project: Project, newStage: string) => {
    try {
      const updateData: Partial<Project> & { id: string } = { 
        id: project.id, 
        stage: newStage 
      };
      
      // If moving to closed_won, set closed_date
      if (newStage === 'closed_won') {
        updateData.closed_date = new Date().toISOString().split('T')[0];
      }
      
      await updateProject.mutateAsync(updateData);
      toast.success('Projeto movido');
    } catch (error) {
      toast.error('Erro ao mover projeto');
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const [y, m, d] = dateStr.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return '—';
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const carteiraFlutuanteTotal = carteiraFlutuanteProjects.reduce(
    (sum, p) => sum + (p.lastPresentedValue || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-flat w-full pl-10"
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 border border-border max-w-xs">
          <span className="font-medium">Carteira Flutuante:</span> projetos de "Apresentação de Projeto" ainda não vendidos nem perdidos.
        </div>
      </div>

      {/* Carteira Flutuante */}
      <div className="border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-widest uppercase text-muted-foreground">Carteira Flutuante</p>
            <p className="text-2xl font-light tracking-tight mt-1">{formatCurrency(carteiraFlutuanteTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{carteiraFlutuanteProjects.length} projetos no funil</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Soma do último valor apresentado de cada projeto</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border border-border p-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Período:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'all', label: 'Todos' },
            { id: 'month', label: 'Este Mês' },
            { id: 'year', label: 'Este Ano' },
            { id: 'custom', label: 'Personalizado' },
          ] as const).map(opt => (
            <button
              key={opt.id}
              onClick={() => setPeriodFilter(opt.id)}
              className={`px-3 py-1 text-xs tracking-widest uppercase border ${periodFilter === opt.id ? 'bg-foreground text-background' : 'border-border hover:bg-muted'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {periodFilter === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input-flat text-sm" />
            <span className="text-muted-foreground text-xs">até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input-flat text-sm" />
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Consultor:</span>
          <select
            value={consultantFilter}
            onChange={(e) => setConsultantFilter(e.target.value)}
            className="input-flat text-sm"
          >
            <option value="all">Todos</option>
            {activeTeamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table View */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-center p-3 text-xs uppercase tracking-wider">Última Apres.</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Cliente / Projeto</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Consultor</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Projetista</th>
              <th className="text-right p-3 text-xs uppercase tracking-wider">Valor</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider">Nº Apres.</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum projeto na Carteira Flutuante
                </td>
              </tr>
            ) : (
              filteredProjects.map(project => {
                const consultant = teamMembers.find(m => m.id === project.responsible_id);
                const projetista = teamMembers.find(m => m.id === project.apresentacao_projetista_id);
                return (
                  <tr key={project.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 text-center text-sm font-mono">{formatDate(project.lastPresentationDate)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{project.clients?.name || project.name}</p>
                          {project.clients?.name && project.name !== project.clients.name && (
                            <p className="text-[11px] text-muted-foreground">{project.name}</p>
                          )}
                          {project.focco_project_number && (
                            <p className="text-xs text-primary font-mono">FOCCO: {project.focco_project_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{consultant?.name || '-'}</td>
                    <td className="p-3 text-sm">{projetista?.name || '-'}</td>
                    <td className="p-3 text-right text-sm font-medium">{formatCurrency(project.lastPresentedValue)}</td>
                    <td className="p-3 text-center text-sm font-medium">{project.presentationCount}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleEdit(project)}
                          className="p-1.5 hover:bg-muted rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenLostModal(project)}
                          className="p-1.5 hover:bg-destructive/20 rounded text-destructive"
                          title="Marcar como Perdido"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-1.5 hover:bg-destructive/20 rounded text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>EDITAR PROJETO</DialogTitle>
            <DialogDescription>Atualize os dados do projeto em negociação exibido na Carteira Flutuante.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="md:col-span-2">
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-flat w-full h-20 resize-none"
              />
            </div>

            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Cliente</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="input-flat w-full"
              >
                <option value="">Selecione</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Profissional</label>
              <select
                value={form.professional_id}
                onChange={(e) => setForm({ ...form, professional_id: e.target.value })}
                className="input-flat w-full"
              >
                <option value="">Selecione</option>
                {professionals.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Responsável</label>
              <select
                value={form.responsible_id}
                onChange={(e) => setForm({ ...form, responsible_id: e.target.value })}
                className="input-flat w-full"
              >
                <option value="">Selecione</option>
                {activeTeamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Projetista de Apresentação</label>
              <select
                value={form.apresentacao_projetista_id}
                onChange={(e) => setForm({ ...form, apresentacao_projetista_id: e.target.value })}
                className="input-flat w-full"
              >
                <option value="">Selecione</option>
                {activeTeamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Estágio</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="input-flat w-full"
              >
                {ACTIVE_STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Valor Estimado (R$)</label>
              <input
                type="number"
                value={form.estimated_value}
                onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Data Início</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Previsão de Entrega</label>
              <input
                type="date"
                value={form.expected_delivery}
                onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })}
                className="input-flat w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Observações</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-flat w-full h-20 resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <button onClick={handleSave} className="btn-primary w-full">
                Salvar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Lost Modal */}
      <Dialog open={showLostModal} onOpenChange={setShowLostModal}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Marcar como Perdido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 border border-border">
              <p className="text-sm font-medium">{projectToLose?.name}</p>
              {projectToLose?.focco_project_number && (
                <p className="text-xs text-primary font-mono">FOCCO: {projectToLose.focco_project_number}</p>
              )}
              {projectToLose?.clients?.name && (
                <p className="text-xs text-muted-foreground">Cliente: {projectToLose.clients.name}</p>
              )}
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                Motivo da Perda
              </label>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="input-flat w-full h-24 resize-none"
                placeholder="Descreva o motivo pelo qual o projeto foi perdido..."
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowLostModal(false)} 
                className="flex-1 px-4 py-2 border border-border hover:bg-muted"
              >
                Cancelar
              </button>
              <button 
                onClick={handleMarkAsLost} 
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700"
              >
                Confirmar Perda
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              O projeto será movido para histórico e o cliente será marcado como perdido.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
