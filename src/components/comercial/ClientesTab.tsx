import { useState } from 'react';
import { Plus, Search, User, Phone, Mail, MapPin, Edit2, Trash2, Eye, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, Client } from '@/hooks/useClients';
import { useProfessionals, useTeamMembers } from '@/hooks/useDatabase';
import { toast } from 'sonner';

const CLIENT_STATUS = [
  { id: 'active', name: 'Ativo', color: 'bg-blue-500/20 text-blue-700' },
  { id: 'presented', name: 'Apresentado', color: 'bg-yellow-500/20 text-yellow-700' },
  { id: 'negotiating', name: 'Em Negociação', color: 'bg-orange-500/20 text-orange-700' },
  { id: 'closed', name: 'Contrato Fechado', color: 'bg-green-500/20 text-green-700' },
  { id: 'lost', name: 'Perdido', color: 'bg-red-500/20 text-red-700' },
];

const ORIGIN_TYPES = [
  { id: 'direct', name: 'Direto' },
  { id: 'professional', name: 'Via Profissional' },
  { id: 'referral', name: 'Indicação' },
  { id: 'marketing', name: 'Marketing' },
];

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  age: string;
  profession: string;
  preferences: string;
  notes: string;
  status: string;
  origin_type: string;
  potential_value: string;
  contract_number: string;
  professional_id: string;
  responsible_id: string;
}

const emptyForm: ClientFormData = {
  name: '',
  email: '',
  phone: '',
  cpf_cnpj: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  age: '',
  profession: '',
  preferences: '',
  notes: '',
  status: 'active',
  origin_type: 'direct',
  potential_value: '',
  contract_number: '',
  professional_id: '',
  responsible_id: '',
};

export default function ClientesTab() {
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: clients = [], isLoading } = useClients();
  const { data: professionals = [] } = useProfessionals();
  const { data: teamMembers = [] } = useTeamMembers();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const activeTeamMembers = teamMembers.filter(m => m.active);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenNew = () => {
    setForm(emptyForm);
    setEditingClient(null);
    setShowModal(true);
  };

  const handleEdit = (client: Client) => {
    setForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      cpf_cnpj: client.cpf_cnpj || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      age: client.age?.toString() || '',
      profession: client.profession || '',
      preferences: client.preferences || '',
      notes: client.notes || '',
      status: client.status || 'active',
      origin_type: client.origin_type || 'direct',
      potential_value: client.potential_value?.toString() || '',
      contract_number: client.contract_number || '',
      professional_id: client.professional_id || '',
      responsible_id: client.responsible_id || '',
    });
    setEditingClient(client);
    setShowModal(true);
  };

  const handleView = (client: Client) => {
    setViewingClient(client);
    setShowViewModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    // Require contract number when status is closed
    if (form.status === 'closed' && !form.contract_number.trim()) {
      toast.error('Número do contrato é obrigatório para status "Contrato Fechado"');
      return;
    }

    const clientData = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      cpf_cnpj: form.cpf_cnpj || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip_code: form.zip_code || null,
      age: form.age ? parseInt(form.age) : null,
      profession: form.profession || null,
      preferences: form.preferences || null,
      notes: form.notes || null,
      status: form.status,
      origin_type: form.origin_type,
      potential_value: form.potential_value ? parseFloat(form.potential_value) : null,
      contract_number: form.contract_number || null,
      professional_id: form.professional_id || null,
      responsible_id: form.responsible_id || null,
    };

    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, ...clientData });
        toast.success('Cliente atualizado com sucesso');
      } else {
        await createClient.mutateAsync(clientData);
        toast.success('Cliente criado com sucesso');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingClient(null);
    } catch (error) {
      toast.error('Erro ao salvar cliente');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteClient.mutateAsync(id);
        toast.success('Cliente excluído');
      } catch (error) {
        toast.error('Erro ao excluir cliente');
      }
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const statusInfo = CLIENT_STATUS.find(s => s.id === status) || CLIENT_STATUS[0];
    return <Badge className={`${statusInfo.color} border-0`}>{statusInfo.name}</Badge>;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
            {CLIENT_STATUS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button onClick={handleOpenNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {CLIENT_STATUS.map(status => {
          const count = clients.filter(c => c.status === status.id).length;
          return (
            <div key={status.id} className="border border-border p-4 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{status.name}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Cliente</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Contato</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Profissional</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Responsável</th>
              <th className="text-left p-3 text-xs uppercase tracking-wider">Status</th>
              <th className="text-right p-3 text-xs uppercase tracking-wider">Valor Potencial</th>
              <th className="text-center p-3 text-xs uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              filteredClients.map(client => (
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
                    <div className="space-y-1">
                      {client.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    {client.professionals?.name || '-'}
                  </td>
                  <td className="p-3 text-sm">
                    {client.responsible?.name || '-'}
                  </td>
                  <td className="p-3">
                    {getStatusBadge(client.status)}
                  </td>
                  <td className="p-3 text-right text-sm">
                    {formatCurrency(client.potential_value)}
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
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-1.5 hover:bg-destructive/20 rounded text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'EDITAR' : 'NOVO'} CLIENTE</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="md:col-span-2">
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nome *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">CPF/CNPJ</label>
              <input
                value={form.cpf_cnpj}
                onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Idade</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Profissão</label>
              <input
                value={form.profession}
                onChange={(e) => setForm({ ...form, profession: e.target.value })}
                className="input-flat w-full"
              />
            </div>

            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">CEP</label>
              <input
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Endereço</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Cidade</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input-flat w-full"
              />
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Estado</label>
              <input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="input-flat w-full"
                maxLength={2}
              />
            </div>

            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Origem</label>
              <select
                value={form.origin_type}
                onChange={(e) => setForm({ ...form, origin_type: e.target.value })}
                className="input-flat w-full"
              >
                {ORIGIN_TYPES.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Profissional Indicador</label>
              <select
                value={form.professional_id}
                onChange={(e) => setForm({ ...form, professional_id: e.target.value })}
                className="input-flat w-full"
              >
                <option value="">Nenhum</option>
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
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Valor Potencial (R$)</label>
              <input
                type="number"
                value={form.potential_value}
                onChange={(e) => setForm({ ...form, potential_value: e.target.value })}
                className="input-flat w-full"
              />
            </div>

            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input-flat w-full"
              >
                {CLIENT_STATUS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            {form.status === 'closed' && (
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nº Contrato *</label>
                <input
                  value={form.contract_number}
                  onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
                  className="input-flat w-full"
                  placeholder="Obrigatório para fechamento"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Preferências</label>
              <textarea
                value={form.preferences}
                onChange={(e) => setForm({ ...form, preferences: e.target.value })}
                className="input-flat w-full h-20 resize-none"
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

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {viewingClient?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingClient && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(viewingClient.status)}
                {viewingClient.contract_number && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Contrato: {viewingClient.contract_number}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                {viewingClient.profession && (
                  <div>
                    <span className="text-muted-foreground">Profissão:</span>
                    <p>{viewingClient.profession}</p>
                  </div>
                )}
                {viewingClient.address && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Endereço:</span>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {viewingClient.address}
                      {viewingClient.city && `, ${viewingClient.city}`}
                      {viewingClient.state && ` - ${viewingClient.state}`}
                    </p>
                  </div>
                )}
                {viewingClient.potential_value && (
                  <div>
                    <span className="text-muted-foreground">Valor Potencial:</span>
                    <p className="font-semibold">{formatCurrency(viewingClient.potential_value)}</p>
                  </div>
                )}
                {viewingClient.professionals?.name && (
                  <div>
                    <span className="text-muted-foreground">Profissional:</span>
                    <p>{viewingClient.professionals.name}</p>
                  </div>
                )}
                {viewingClient.responsible?.name && (
                  <div>
                    <span className="text-muted-foreground">Responsável:</span>
                    <p>{viewingClient.responsible.name}</p>
                  </div>
                )}
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
    </div>
  );
}
