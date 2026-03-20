import { useState, useMemo } from 'react';
import { Search, Folder, Edit2, Trash2, Calendar, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useProjects, useUpdateProject, useDeleteProject, PROJECT_STAGES, Project } from '@/hooks/useProjects';
import { useClients, useUpdateClient } from '@/hooks/useClients';
import { useProfessionals, useTeamMembers } from '@/hooks/useDatabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ProjectValueHistory } from '@/components/ProjectValueHistory';
import { differenceInDays, parseISO } from 'date-fns';

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
};

// Filter stages for display - only "Em negociação" and "Perdidos" (closed_won goes to Contratos)
const ACTIVE_STAGES = PROJECT_STAGES.filter(s => s.id === 'em_negociacao' || s.id === 'closed_lost');

export default function ProjetosTab() {
  const [showModal, setShowModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToLose, setProjectToLose] = useState<Project | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  

  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: professionals = [] } = useProfessionals();
  const { data: teamMembers = [] } = useTeamMembers();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const updateClient = useUpdateClient();

  const activeTeamMembers = teamMembers.filter(m => m.active);

  // Filter only projects for this tab (Em negociação and Perdidos)
  const activeProjects = useMemo(() => {
    return projects.filter(p => p.stage === 'em_negociacao' || p.stage === 'closed_lost');
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return activeProjects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.focco_project_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = stageFilter === 'all' || project.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [activeProjects, searchTerm, stageFilter]);

  const projectsByStage = useMemo(() => {
    return ACTIVE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = filteredProjects.filter(p => p.stage === stage.id);
      return acc;
    }, {} as Record<string, Project[]>);
  }, [filteredProjects]);

  const handleEdit = (project: Project) => {
    setForm({
      name: project.name,
      description: project.description || '',
      stage: project.stage || 'lead',
      estimated_value: project.estimated_value?.toString() || '',
      closed_value: project.closed_value?.toString() || '',
      start_date: project.start_date || '',
      expected_delivery: project.expected_delivery || '',
      notes: project.notes || '',
      client_id: project.client_id || '',
      professional_id: project.professional_id || '',
      responsible_id: project.responsible_id || '',
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
    };

    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, ...projectData });
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

  const getStageTotals = () => {
    return ACTIVE_STAGES.map(stage => {
      const stageProjects = activeProjects.filter(p => p.stage === stage.id);
      const total = stageProjects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
      return { ...stage, count: stageProjects.length, total };
    });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;
  }

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
        {/* Info: Projects are created automatically from action registration */}
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 border border-border max-w-xs">
          <span className="font-medium">Projetos são criados automaticamente</span> ao registrar ações "Apresentação de Projeto" com nº FOCCO.
        </div>
      </div>

      {/* Carteira Flutuante */}
      {(() => {
        const emNegociacao = activeProjects.filter(p => p.stage === 'em_negociacao');
        const carteiraFlutuante = emNegociacao.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
        return (
          <div className="border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs tracking-widest uppercase text-muted-foreground">Carteira Flutuante</p>
                <p className="text-2xl font-light tracking-tight mt-1">{formatCurrency(carteiraFlutuante)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{emNegociacao.length} projetos em negociação</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Último valor apresentado por projeto</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {getStageTotals().map(stage => (
          <div key={stage.id} className={`border border-border p-3 ${stage.color}`}>
            <p className="text-lg font-bold">{stage.count}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider truncate">{stage.name}</p>
            <p className="text-xs font-medium mt-1">{formatCurrency(stage.total)}</p>
          </div>
        ))}
      </div>

      {/* Table View */}
      {(
        <div className="border border-border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs uppercase tracking-wider">Projeto</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider">Profissional</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider">Consultor</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider">Estágio</th>
                <th className="text-right p-3 text-xs uppercase tracking-wider">Valor Est.</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider">Previsão</th>
                <th className="text-center p-3 text-xs uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Nenhum projeto ativo encontrado
                  </td>
                </tr>
              ) : (
                filteredProjects.map(project => {
                  const stageInfo = ACTIVE_STAGES.find(s => s.id === project.stage) || ACTIVE_STAGES[0];
                  const professional = professionals.find(p => p.id === project.professional_id);
                  const consultant = teamMembers.find(m => m.id === project.responsible_id);
                  
                  return (
                    <tr key={project.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{project.name}</p>
                            {project.focco_project_number && (
                              <p className="text-xs text-primary font-mono">FOCCO: {project.focco_project_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{project.clients?.name || '-'}</td>
                      <td className="p-3 text-sm">{professional?.name || '-'}</td>
                      <td className="p-3 text-sm">{consultant?.name || '-'}</td>
                      <td className="p-3">
                        <Badge className={`${stageInfo.color} border-0`}>{stageInfo.name}</Badge>
                      </td>
                      <td className="p-3 text-right text-sm">{formatCurrency(project.estimated_value)}</td>
                      <td className="p-3 text-sm">
                        {project.expected_delivery && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.expected_delivery).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>
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
                            className="p-1.5 hover:bg-red-500/20 rounded text-red-600"
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
      )}

      {/* Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>EDITAR PROJETO</DialogTitle>
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
