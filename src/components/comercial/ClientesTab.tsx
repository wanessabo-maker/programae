import { useState, useMemo } from 'react';
import { Search, User, Phone, Mail, Eye, TrendingUp, Users, XCircle, CheckCircle, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useClients, useUpdateClient, Client } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

// Simplified status for the funnel - clients come from actions only
const CLIENT_STATUS = [
  { id: 'apresentado', name: 'Em Negociação', color: 'bg-orange-500/20 text-orange-700', chartColor: 'hsl(var(--chart-2))' },
  { id: 'lost', name: 'Perdido', color: 'bg-red-500/20 text-red-700', chartColor: 'hsl(var(--chart-5))' },
  { id: 'closed', name: 'Vendido', color: 'bg-green-500/20 text-green-700', chartColor: 'hsl(var(--chart-1))' },
];

export default function ClientesTab() {
  const { toast } = useToast();
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    age: '',
    profession: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    status: '',
  });

  const { data: clients = [], isLoading } = useClients();
  const { data: projects = [] } = useProjects();
  const { actions, actionTypes, teamMembers, professionals } = useApp();
  const updateClientMutation = useUpdateClient();

  // Get clients linked to projects (from "Apresentação de Projeto" actions)
  const funnelClients = useMemo(() => {
    // Only show clients that are linked to projects (automated funnel)
    const clientsWithProjects = clients.filter(client => {
      return projects.some(p => p.client_id === client.id);
    });
    return clientsWithProjects;
  }, [clients, projects]);

  // Status counts for funnel visualization
  const statusCounts = useMemo(() => {
    const counts = {
      apresentado: 0,
      lost: 0,
      closed: 0,
    };
    
    funnelClients.forEach(client => {
      if (client.status === 'closed') {
        counts.closed++;
      } else if (client.status === 'lost') {
        counts.lost++;
      } else {
        // All other statuses (apresentado, negotiating, active) are "Em Negociação"
        counts.apresentado++;
      }
    });
    
    return counts;
  }, [funnelClients]);

  // Chart data for pie chart
  const pieChartData = useMemo(() => {
    return [
      { name: 'Em Negociação', value: statusCounts.apresentado, fill: 'hsl(var(--chart-2))' },
      { name: 'Perdido', value: statusCounts.lost, fill: 'hsl(var(--chart-5))' },
      { name: 'Vendido', value: statusCounts.closed, fill: 'hsl(var(--chart-1))' },
    ].filter(item => item.value > 0);
  }, [statusCounts]);

  // Profile analytics
  const profileAnalytics = useMemo(() => {
    const professions: Record<string, number> = {};
    const ageGroups: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
    let totalPresentations = 0;

    funnelClients.forEach(client => {
      // Count professions
      if (client.profession) {
        professions[client.profession] = (professions[client.profession] || 0) + 1;
      }

      // Age groups
      if (client.age) {
        if (client.age <= 25) ageGroups['18-25']++;
        else if (client.age <= 35) ageGroups['26-35']++;
        else if (client.age <= 45) ageGroups['36-45']++;
        else if (client.age <= 55) ageGroups['46-55']++;
        else ageGroups['56+']++;
      }

      // Count presentations (projects linked to this client)
      const clientProjects = projects.filter(p => p.client_id === client.id);
      totalPresentations += clientProjects.length;
    });

    const topProfessions = Object.entries(professions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const ageData = Object.entries(ageGroups)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    return {
      topProfessions,
      ageData,
      avgPresentations: funnelClients.length > 0 ? (totalPresentations / funnelClients.length).toFixed(1) : '0',
    };
  }, [funnelClients, projects]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return funnelClients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm);
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'apresentado') {
          matchesStatus = client.status !== 'closed' && client.status !== 'lost';
        } else {
          matchesStatus = client.status === statusFilter;
        }
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [funnelClients, searchTerm, statusFilter]);

  // Group clients by status
  const clientsByStatus = useMemo(() => {
    return {
      apresentado: filteredClients.filter(c => c.status !== 'closed' && c.status !== 'lost'),
      lost: filteredClients.filter(c => c.status === 'lost'),
      closed: filteredClients.filter(c => c.status === 'closed'),
    };
  }, [filteredClients]);

  const handleView = (client: Client) => {
    setViewingClient(client);
    setShowViewModal(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      cpf_cnpj: client.cpf_cnpj || '',
      age: client.age?.toString() || '',
      profession: client.profession || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      notes: client.notes || '',
      status: client.status || 'apresentado',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;

    try {
      await updateClientMutation.mutateAsync({
        id: editingClient.id,
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        cpf_cnpj: editForm.cpf_cnpj.trim() || null,
        age: editForm.age ? parseInt(editForm.age) : null,
        profession: editForm.profession.trim() || null,
        address: editForm.address.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state.trim() || null,
        zip_code: editForm.zip_code.trim() || null,
        notes: editForm.notes.trim() || null,
        status: editForm.status || null,
      });

      toast({ title: 'Cliente atualizado com sucesso' });
      setShowEditModal(false);
      setEditingClient(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    if (status === 'closed') {
      return <Badge className="bg-green-500/20 text-green-700 border-0">Vendido</Badge>;
    } else if (status === 'lost') {
      return <Badge className="bg-red-500/20 text-red-700 border-0">Perdido</Badge>;
    }
    return <Badge className="bg-orange-500/20 text-orange-700 border-0">Em Negociação</Badge>;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Get project linked to client
  const getClientProject = (clientId: string) => {
    return projects.find(p => p.client_id === clientId);
  };

  // Get presentation action for client
  const getClientPresentationAction = (clientId: string) => {
    const project = getClientProject(clientId);
    if (!project) return null;
    
    return actions.find(a => {
      const actionType = actionTypes.find(t => t.id === a.actionTypeId);
      return a.projectId === project.id && 
        actionType?.name?.toLowerCase().includes('apresentação');
    });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const chartConfig = {
    emNegociacao: { label: 'Em Negociação', color: 'hsl(var(--chart-2))' },
    perdido: { label: 'Perdido', color: 'hsl(var(--chart-5))' },
    vendido: { label: 'Vendido', color: 'hsl(var(--chart-1))' },
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="text-xs text-muted-foreground bg-muted/50 px-4 py-3 border border-border">
        <span className="font-medium">Clientes são captados automaticamente</span> através do registro de ações "Apresentação de Projeto" e "Venda".
      </div>

      {/* Funnel Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border p-4 bg-orange-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-orange-600" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">Em Negociação</span>
          </div>
          <p className="text-3xl font-light">{statusCounts.apresentado}</p>
        </div>
        <div className="border border-border p-4 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">Perdidos</span>
          </div>
          <p className="text-3xl font-light">{statusCounts.lost}</p>
        </div>
        <div className="border border-border p-4 bg-green-500/5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">Vendidos</span>
          </div>
          <p className="text-3xl font-light">{statusCounts.closed}</p>
        </div>
      </div>

      {/* Charts Section */}
      {funnelClients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Pie Chart */}
          <div className="border border-border p-4">
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-4">Distribuição do Funil</h3>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {pieChartData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.fill }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Analytics */}
          <div className="border border-border p-4">
            <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-4">Perfil dos Clientes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Top Professions */}
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">Top Profissões</span>
                {profileAnalytics.topProfessions.length > 0 ? (
                  <div className="space-y-1">
                    {profileAnalytics.topProfessions.map((prof, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="truncate">{prof.name}</span>
                        <span className="font-medium">{prof.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem dados</p>
                )}
              </div>

              {/* Age Distribution */}
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">Faixa Etária</span>
                {profileAnalytics.ageData.length > 0 ? (
                  <div className="space-y-1">
                    {profileAnalytics.ageData.map((age, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{age.name}</span>
                        <span className="font-medium">{age.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem dados</p>
                )}
              </div>

              {/* Average Presentations */}
              <div className="sm:col-span-2 pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Média de Apresentações por Cliente</span>
                  <span className="font-medium">{profileAnalytics.avgPresentations}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-flat w-full pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-flat"
          >
            <option value="all">Todos os status</option>
            <option value="apresentado">Em Negociação</option>
            <option value="lost">Perdido</option>
            <option value="closed">Vendido</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Cliente</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Projeto FOCCO</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Profissional</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Consultor</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Data Apresentação</th>
              <th className="text-right p-3 text-xs uppercase tracking-wider">Valor</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Status</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Nenhum cliente encontrado no funil comercial
                </td>
              </tr>
            ) : (
              filteredClients.map(client => {
                const project = getClientProject(client.id);
                const presentationAction = getClientPresentationAction(client.id);
                const consultant = teamMembers.find(m => m.id === client.responsible_id);
                const professional = professionals.find(p => p.id === client.professional_id);

                return (
                  <tr key={client.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{client.name}</p>
                          {client.profession && (
                            <p className="text-xs text-muted-foreground">{client.profession}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {project?.focco_project_number ? (
                        <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {project.focco_project_number}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-sm">{professional?.name || '-'}</td>
                    <td className="p-3 text-sm">{consultant?.name || '-'}</td>
                    <td className="p-3 text-sm">
                      {presentationAction?.date 
                        ? format(parseISO(presentationAction.date), 'dd/MM/yyyy', { locale: ptBR })
                        : project?.start_date 
                          ? format(parseISO(project.start_date), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                      }
                    </td>
                    <td className="p-3 text-right text-sm">
                      {formatCurrency(project?.estimated_value || client.potential_value)}
                    </td>
                    <td className="p-3">
                      {getStatusBadge(client.status)}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleView(client)}
                          className="p-1.5 hover:bg-muted rounded"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-1.5 hover:bg-muted rounded"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
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

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {viewingClient?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingClient && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(viewingClient.status)}
                {viewingClient.contract_number && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Contrato: {viewingClient.contract_number}
                  </Badge>
                )}
              </div>

              {/* Project Info */}
              {(() => {
                const project = getClientProject(viewingClient.id);
                return project ? (
                  <div className="border border-border p-3 bg-muted/30">
                    <span className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Projeto Vinculado</span>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">FOCCO:</span>
                        <p className="font-mono">{project.focco_project_number || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <p>{formatCurrency(project.closed_value || project.estimated_value)}</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewingClient.age && (
                  <div>
                    <span className="text-muted-foreground">Idade:</span>
                    <p>{viewingClient.age} anos</p>
                  </div>
                )}
                {viewingClient.profession && (
                  <div>
                    <span className="text-muted-foreground">Profissão:</span>
                    <p>{viewingClient.profession}</p>
                  </div>
                )}
                {viewingClient.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p>{viewingClient.email}</p>
                  </div>
                )}
                {viewingClient.phone && (
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p>{viewingClient.phone}</p>
                  </div>
                )}
                {viewingClient.cpf_cnpj && (
                  <div>
                    <span className="text-muted-foreground">CPF/CNPJ:</span>
                    <p>{viewingClient.cpf_cnpj}</p>
                  </div>
                )}
                {(() => {
                  const professional = professionals.find(p => p.id === viewingClient.professional_id);
                  return professional ? (
                    <div>
                      <span className="text-muted-foreground">Profissional:</span>
                      <p>{professional.name}</p>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const consultant = teamMembers.find(m => m.id === viewingClient.responsible_id);
                  return consultant ? (
                    <div>
                      <span className="text-muted-foreground">Consultor Responsável:</span>
                      <p>{consultant.name}</p>
                    </div>
                  ) : null;
                })()}
              </div>

              {viewingClient.notes && (
                <div className="border-t border-border pt-4">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Observações</span>
                  <p className="mt-1 text-sm">{viewingClient.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Editar Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Nome *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input-flat w-full mt-1"
                >
                  <option value="apresentado">Em Negociação</option>
                  <option value="lost">Perdido</option>
                  <option value="closed">Vendido</option>
                </select>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Telefone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  CPF/CNPJ
                </label>
                <input
                  type="text"
                  value={editForm.cpf_cnpj}
                  onChange={(e) => setEditForm({ ...editForm, cpf_cnpj: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Idade
                </label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Profissão
                </label>
                <input
                  type="text"
                  value={editForm.profession}
                  onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Endereço
              </label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="input-flat w-full mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Cidade
                </label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Estado
                </label>
                <input
                  type="text"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="input-flat w-full mt-1"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  CEP
                </label>
                <input
                  type="text"
                  value={editForm.zip_code}
                  onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                  className="input-flat w-full mt-1"
                />
              </div>
            </div>

            {/* Notes */}
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
              onClick={handleSaveEdit}
              disabled={!editForm.name.trim()}
              className="btn-primary bg-foreground text-background flex-1 disabled:opacity-50"
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
    </div>
  );
}
