import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, FileText, Calendar, TrendingUp, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProjects, Project } from '@/hooks/useProjects';
import { useApp } from '@/contexts/AppContext';

type PeriodFilter = 'all' | 'month' | 'year' | 'custom';

export default function ContratosTab() {
  const { data: projects = [], isLoading } = useProjects();
  const { teamMembers, professionals, actions, actionTypes } = useApp();
  
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Get only closed projects (closed_won stage)
  const closedProjects = useMemo(() => {
    return projects.filter(p => p.stage === 'closed_won');
  }, [projects]);

  // Filter by period
  const filteredProjects = useMemo(() => {
    if (periodFilter === 'all') return closedProjects;
    
    const now = new Date();
    let start: Date;
    let end: Date;
    
    switch (periodFilter) {
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'custom':
        if (!customStart || !customEnd) return closedProjects;
        start = parseISO(customStart);
        end = parseISO(customEnd);
        break;
      default:
        return closedProjects;
    }
    
    return closedProjects.filter(p => {
      if (!p.closed_date) return false;
      const closedDate = parseISO(p.closed_date);
      return isWithinInterval(closedDate, { start, end });
    });
  }, [closedProjects, periodFilter, customStart, customEnd]);

  // Calculate totals
  const totalValue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (p.closed_value || p.estimated_value || 0), 0);
  }, [filteredProjects]);

  // Get related actions for a project (sales actions)
  const getProjectSalesActions = (projectId: string) => {
    return actions.filter(a => {
      const actionType = actionTypes.find(t => t.id === a.actionTypeId);
      return a.projectId === projectId && actionType?.classification === 'venda';
    });
  };

  // Get all actions for a project
  const getProjectActions = (projectId: string) => {
    return actions.filter(a => a.projectId === projectId);
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

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Carregando contratos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
      </div>

      {/* Contracts Table */}
      {filteredProjects.length === 0 ? (
        <div className="border border-border p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum contrato fechado no período selecionado</p>
          <p className="text-xs text-muted-foreground mt-2">
            Os contratos são gerados automaticamente quando uma Venda é registrada em +Registro de Ações
          </p>
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground">Projeto FOCCO</th>
                <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground">Nome</th>
                <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground">Cliente</th>
                <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground">Profissional</th>
                <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground">Responsável</th>
                <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground">Data Fechamento</th>
                <th className="text-right p-3 text-xs tracking-widest uppercase text-muted-foreground">Valor</th>
                <th className="text-center p-3 text-xs tracking-widest uppercase text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b border-border hover:bg-muted/20">
                  <td className="p-3 text-sm font-mono">{project.focco_project_number || '-'}</td>
                  <td className="p-3 text-sm">{project.name}</td>
                  <td className="p-3 text-sm">{project.clients?.name || '-'}</td>
                  <td className="p-3 text-sm">{project.professionals?.name || '-'}</td>
                  <td className="p-3 text-sm">{project.responsible?.name || '-'}</td>
                  <td className="p-3 text-sm">
                    {project.closed_date 
                      ? format(parseISO(project.closed_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </td>
                  <td className="p-3 text-sm text-right font-medium">
                    {formatCurrency(project.closed_value || project.estimated_value)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleViewProject(project)}
                      className="p-1 hover:bg-muted rounded"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30">
                <td colSpan={6} className="p-3 text-sm font-medium text-right">Total:</td>
                <td className="p-3 text-sm text-right font-bold">{formatCurrency(totalValue)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* View Project Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato: {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6 py-4">
              {/* Project Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-1">Nº FOCCO</span>
                  <p className="font-mono">{selectedProject.focco_project_number || '-'}</p>
                </div>
                <div>
                  <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-1">Data Fechamento</span>
                  <p>
                    {selectedProject.closed_date 
                      ? format(parseISO(selectedProject.closed_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-1">Cliente</span>
                  <p>{selectedProject.clients?.name || '-'}</p>
                </div>
                <div>
                  <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-1">Profissional</span>
                  <p>{selectedProject.professionals?.name || '-'}</p>
                </div>
                <div>
                  <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-1">Responsável</span>
                  <p>{selectedProject.responsible?.name || '-'}</p>
                </div>
                <div>
                  <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-1">Valor Fechado</span>
                  <p className="text-lg font-medium">
                    {formatCurrency(selectedProject.closed_value || selectedProject.estimated_value)}
                  </p>
                </div>
              </div>

              {selectedProject.notes && (
                <div>
                  <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-1">Observações</span>
                  <p className="text-sm">{selectedProject.notes}</p>
                </div>
              )}

              {/* Sales History */}
              <div>
                <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-3">
                  Histórico de Ações Vinculadas
                </span>
                <div className="border border-border">
                  {getProjectActions(selectedProject.id).length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      Nenhuma ação vinculada a este projeto
                    </p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground">Data</th>
                          <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground">Tipo</th>
                          <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground">Consultor</th>
                          <th className="text-right p-2 text-xs tracking-widest uppercase text-muted-foreground">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getProjectActions(selectedProject.id).map((action) => {
                          const actionType = actionTypes.find(t => t.id === action.actionTypeId);
                          return (
                            <tr key={action.id} className="border-b border-border">
                              <td className="p-2 text-sm">
                                {format(parseISO(action.date), 'dd/MM/yyyy', { locale: ptBR })}
                              </td>
                              <td className="p-2 text-sm">
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  actionType?.classification === 'venda' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : 'bg-muted'
                                }`}>
                                  {actionType?.name || '-'}
                                </span>
                              </td>
                              <td className="p-2 text-sm">{getResponsibleName(action.consultantId)}</td>
                              <td className="p-2 text-sm text-right">
                                {action.value ? formatCurrency(action.value) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
