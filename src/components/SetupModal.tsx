import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { Plus, Pencil, Trash2, X, Check, Upload, ClipboardList, FileUp, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO, isValid } from 'date-fns';
import { getCategoryForAction } from '@/hooks/useProfessionalCategory';
import { CSSetupTab } from '@/components/setup/CSSetupTab';
import { ATSetupTab } from '@/components/setup/ATSetupTab';
import { AdditionalFieldKey } from '@/types';

// Field definitions for additional fields configuration
const ADDITIONAL_FIELDS_CONFIG: {
  key: AdditionalFieldKey;
  label: string;
}[] = [{
  key: 'clientName',
  label: 'Nome do Cliente'
}, {
  key: 'clientAge',
  label: 'Idade'
}, {
  key: 'clientProfession',
  label: 'Profissão'
}, {
  key: 'presentationNumber',
  label: 'Nº Apresentação'
}, {
  key: 'foccoProjectNumber',
  label: 'Nº Projeto FOCCO'
}, {
  key: 'contractNumber',
  label: 'Nº Contrato'
}, {
  key: 'clientPhone',
  label: 'Telefone'
}, {
  key: 'clientEmail',
  label: 'E-mail'
}, {
  key: 'clientCpfCnpj',
  label: 'CPF/CNPJ'
}, {
  key: 'clientAddress',
  label: 'Endereço'
}, {
  key: 'clientCity',
  label: 'Cidade'
}, {
  key: 'clientState',
  label: 'Estado'
}, {
  key: 'presentedValue',
  label: 'Valor Apresentado'
}];
interface SetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const TAB_CONFIG = [{
  label: 'Áreas',
  value: 'areas'
}, {
  label: 'Equipe',
  value: 'equipe'
}, {
  label: 'Metas',
  value: 'metas'
}, {
  label: 'Tipos de Ação',
  value: 'tipos-acao'
}, {
  label: 'Programa E+',
  value: 'programa'
}, {
  label: 'Tipos Prof.',
  value: 'tipos-prof'
}, {
  label: 'Categorias',
  value: 'categorias'
}, {
  label: 'Customer Success',
  value: 'cs'
}, {
  label: 'Assist. Técnica',
  value: 'at'
}, {
  label: 'Importação',
  value: 'importacao'
}];
export function SetupModal({
  open,
  onOpenChange
}: SetupModalProps) {
  // No more password authentication - access is controlled by isAdmin in Layout
  const handleClose = () => {
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card text-card-foreground border-black max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>SETUP</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="areas" className="h-full">
          <TabsList className="bg-transparent border-b border-black rounded-none w-full justify-start gap-0 h-auto p-0 flex-wrap">
            {TAB_CONFIG.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent text-xs tracking-widest uppercase px-3 py-3">
                {tab.label}
              </TabsTrigger>)}
          </TabsList>
          
          <div className="overflow-y-auto max-h-[60vh] py-4">
            <TabsContent value="areas"><AreasTab /></TabsContent>
            <TabsContent value="equipe"><EquipeTab /></TabsContent>
            <TabsContent value="metas"><MetasTab /></TabsContent>
            <TabsContent value="tipos-acao"><TiposAcaoTab /></TabsContent>
            <TabsContent value="programa"><ProgramaTab /></TabsContent>
            <TabsContent value="tipos-prof"><TiposProfTab /></TabsContent>
            <TabsContent value="categorias"><CategoriasTab /></TabsContent>
            <TabsContent value="cs"><CSSetupTab /></TabsContent>
            <TabsContent value="at"><ATSetupTab /></TabsContent>
            <TabsContent value="importacao"><ImportacaoTab /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>;
}
const AreasTab = () => {
  const {
    areas,
    addArea,
    updateArea,
    deleteArea
  } = useApp();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const handleAdd = () => {
    if (newName.trim()) {
      addArea({
        name: newName.trim()
      });
      setNewName('');
    }
  };
  return <div className="space-y-4">
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nova área" className="input-flat flex-1 text-card-foreground" />
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {areas.map(area => <div key={area.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === area.id ? <>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="input-flat flex-1 mr-2 text-card-foreground" />
                <button onClick={() => {
            updateArea(area.id, {
              name: editName
            });
            setEditingId(null);
          }} className="p-2">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2">
                  <X className="w-4 h-4" />
                </button>
              </> : <>
                <span className="text-sm">{area.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => {
              setEditingId(area.id);
              setEditName(area.name);
            }} className="p-2 opacity-60 hover:opacity-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteArea(area.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>}
          </div>)}
      </div>
    </div>;
};
const EquipeTab = () => {
  const {
    teamMembers,
    areas,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember
  } = useApp();
  const [newName, setNewName] = useState('');
  const [newAreaId, setNewAreaId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    areaId: ''
  });
  const handleAdd = () => {
    if (newName.trim() && newAreaId) {
      addTeamMember({
        name: newName.trim(),
        areaId: newAreaId,
        active: true
      });
      setNewName('');
      setNewAreaId('');
    }
  };
  const handleEdit = (id: string) => {
    const member = teamMembers.find(m => m.id === id);
    if (member) {
      setEditForm({
        name: member.name,
        areaId: member.areaId
      });
      setEditingId(id);
    }
  };
  const handleSaveEdit = () => {
    if (editingId && editForm.name.trim()) {
      updateTeamMember(editingId, {
        name: editForm.name.trim(),
        areaId: editForm.areaId
      });
      setEditingId(null);
    }
  };
  return <div className="space-y-4">
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome" className="input-flat flex-1 text-card-foreground" />
        <select value={newAreaId} onChange={e => setNewAreaId(e.target.value)} className="input-flat text-card-foreground">
          <option value="">Área</option>
          {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {teamMembers.map(member => <div key={member.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === member.id ? <>
                <div className="flex items-center gap-2 flex-1">
                  <input value={editForm.name} onChange={e => setEditForm({
              ...editForm,
              name: e.target.value
            })} className="input-flat flex-1 text-card-foreground" />
                  <select value={editForm.areaId} onChange={e => setEditForm({
              ...editForm,
              areaId: e.target.value
            })} className="input-flat text-card-foreground">
                    {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-1">
                  <button onClick={handleSaveEdit} className="p-2">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </> : <>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{areas.find(a => a.id === member.areaId)?.name}</span>
                  <button onClick={() => updateTeamMember(member.id, {
              active: !member.active
            })} className={`text-xs px-2 py-1 border ${member.active ? 'border-success text-success' : 'border-muted-foreground text-muted-foreground'}`}>
                    {member.active ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(member.id)} className="p-2 opacity-60 hover:opacity-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteTeamMember(member.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>}
          </div>)}
      </div>
    </div>;
};
const MetasTab = () => {
  const {
    metas,
    areas,
    teamMembers,
    professionalCategories,
    addMeta,
    updateMeta,
    deleteMeta
  } = useApp();
  const [newAreaId, setNewAreaId] = useState('');
  const [newTeamMemberId, setNewTeamMemberId] = useState('');
  const [newType, setNewType] = useState<'acoes' | 'vendas' | 'captacao' | 'projeto' | 'categoria'>('acoes');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newValidityType, setNewValidityType] = useState<'mensal' | 'trimestral' | 'semestral' | 'anual' | 'personalizada'>('mensal');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    value: '',
    validityType: 'mensal' as 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'personalizada',
    startDate: '',
    endDate: ''
  });

  // Filter active team members by selected area
  const filteredTeamMembers = useMemo(() => {
    if (!newAreaId) return [];
    return teamMembers.filter(m => m.active && m.areaId === newAreaId);
  }, [newAreaId, teamMembers]);
  const calculateDates = (validityType: string, startDate?: string) => {
    const today = new Date();
    let start = startDate ? new Date(startDate) : today;
    let end = new Date(start);
    switch (validityType) {
      case 'mensal':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'trimestral':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'semestral':
        const semester = Math.floor(today.getMonth() / 6);
        start = new Date(today.getFullYear(), semester * 6, 1);
        end = new Date(today.getFullYear(), (semester + 1) * 6, 0);
        break;
      case 'anual':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case 'personalizada':
        return {
          start: startDate || '',
          end: ''
        };
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };
  const handleAdd = () => {
    if (newAreaId && newTeamMemberId && newValue) {
      if (newType === 'categoria' && !newCategoryId) return;
      const dates = calculateDates(newValidityType, newStartDate);
      addMeta({
        areaId: newAreaId,
        teamMemberId: newTeamMemberId,
        type: newType,
        value: Number(newValue),
        categoryId: newType === 'categoria' ? newCategoryId : undefined,
        validityType: newValidityType,
        startDate: newValidityType === 'personalizada' ? newStartDate : dates.start,
        endDate: newValidityType === 'personalizada' ? newEndDate : dates.end,
        isActive: true
      });
      setNewValue('');
      setNewCategoryId('');
      setNewValidityType('mensal');
      setNewStartDate('');
      setNewEndDate('');
    }
  };
  const handleEdit = (meta: typeof metas[0]) => {
    setEditForm({
      value: String(meta.value),
      validityType: meta.validityType,
      startDate: meta.startDate || '',
      endDate: meta.endDate || ''
    });
    setEditingId(meta.id);
  };
  const handleSaveEdit = (meta: typeof metas[0]) => {
    const dates = calculateDates(editForm.validityType, editForm.startDate);
    updateMeta(meta.id, {
      value: Number(editForm.value),
      validityType: editForm.validityType,
      startDate: editForm.validityType === 'personalizada' ? editForm.startDate : dates.start,
      endDate: editForm.validityType === 'personalizada' ? editForm.endDate : dates.end
    });
    setEditingId(null);
  };
  const typeLabels: Record<string, {
    label: string;
    description: string;
  }> = {
    acoes: {
      label: 'Ações',
      description: 'Total de atividades registradas pelo colaborador'
    },
    vendas: {
      label: 'Vendas',
      description: 'Valor total de vendas fechadas (R$)'
    },
    captacao: {
      label: 'Captação',
      description: 'Quantidade de ações que impactam a meta de captação'
    },
    projeto: {
      label: 'Projeto',
      description: 'Quantidade de ações que impactam a meta de projetos'
    },
    categoria: {
      label: '% Categoria',
      description: 'Percentual de especificadores em determinada categoria'
    }
  };
  const validityLabels: Record<string, string> = {
    mensal: 'Mensal',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
    personalizada: 'Personalizada'
  };
  const getMetaLabel = (meta: typeof metas[0]) => {
    if (meta.type === 'categoria' && meta.categoryId) {
      const cat = professionalCategories.find(c => c.id === meta.categoryId);
      return `% ${cat?.name || 'Categoria'}`;
    }
    return typeLabels[meta.type]?.label || meta.type;
  };
  const isMetaExpired = (meta: typeof metas[0]) => {
    if (!meta.endDate) return false;
    return new Date(meta.endDate) < new Date();
  };
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  // Separate active and expired metas
  const activeMetas = metas.filter(m => m.isActive && !isMetaExpired(m));
  const expiredMetas = metas.filter(m => !m.isActive || isMetaExpired(m));
  return <div className="space-y-6">
      {/* Add new meta */}
      <div className="space-y-3 border border-black p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Nova Meta (por Colaborador)</p>
        <div className="flex gap-2 flex-wrap">
          <select value={newAreaId} onChange={e => {
          setNewAreaId(e.target.value);
          setNewTeamMemberId('');
        }} className="input-flat text-card-foreground">
            <option value="">Área</option>
            {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
          <select value={newTeamMemberId} onChange={e => setNewTeamMemberId(e.target.value)} className="input-flat text-card-foreground" disabled={!newAreaId}>
            <option value="">Colaborador</option>
            {filteredTeamMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <div className="flex flex-col">
            <select value={newType} onChange={e => setNewType(e.target.value as typeof newType)} className="input-flat text-card-foreground">
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="text-[10px] text-muted-foreground mt-1">{typeLabels[newType]?.description}</span>
          </div>
          {newType === 'categoria' && <select value={newCategoryId} onChange={e => setNewCategoryId(e.target.value)} className="input-flat text-card-foreground">
              <option value="">Selecione a Categoria</option>
              {professionalCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>}
          <div className="relative">
            {newType === 'vendas' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>}
            <input type="number" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={newType === 'vendas' ? 'Valor R$' : newType === 'categoria' ? 'Valor %' : 'Quantidade'} className={`input-flat w-32 text-card-foreground ${newType === 'vendas' ? 'pl-10' : ''}`} />
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground">Validade:</span>
          <select value={newValidityType} onChange={e => setNewValidityType(e.target.value as typeof newValidityType)} className="input-flat text-card-foreground">
            {Object.entries(validityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          
          {newValidityType === 'personalizada' && <>
              <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="input-flat text-card-foreground" placeholder="Data inicial" />
              <span className="text-xs text-muted-foreground">até</span>
              <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className="input-flat text-card-foreground" placeholder="Data final" />
            </>}
          
          <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active metas */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Metas Ativas ({activeMetas.length})</p>
        {activeMetas.map(meta => <div key={meta.id} className="flex items-center justify-between p-3 border border-black bg-card">
            {editingId === meta.id ? <div className="flex flex-wrap items-center gap-2 flex-1">
                <span className="text-sm">{areas.find(a => a.id === meta.areaId)?.name}</span>
                <span className="text-xs text-muted-foreground uppercase">{getMetaLabel(meta)}</span>
                <div className="relative">
                  {meta.type === 'vendas' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>}
                  <input type="number" value={editForm.value} onChange={e => setEditForm({
              ...editForm,
              value: e.target.value
            })} className={`input-flat w-32 text-card-foreground ${meta.type === 'vendas' ? 'pl-10' : ''}`} />
                </div>
                <select value={editForm.validityType} onChange={e => setEditForm({
            ...editForm,
            validityType: e.target.value as typeof editForm.validityType
          })} className="input-flat text-card-foreground text-xs">
                  {Object.entries(validityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {editForm.validityType === 'personalizada' && <>
                    <input type="date" value={editForm.startDate} onChange={e => setEditForm({
              ...editForm,
              startDate: e.target.value
            })} className="input-flat text-card-foreground text-xs" />
                    <input type="date" value={editForm.endDate} onChange={e => setEditForm({
              ...editForm,
              endDate: e.target.value
            })} className="input-flat text-card-foreground text-xs" />
                  </>}
                <button onClick={() => handleSaveEdit(meta)} className="p-2">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2">
                  <X className="w-4 h-4" />
                </button>
              </div> : <>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium">{teamMembers.find(m => m.id === meta.teamMemberId)?.name || areas.find(a => a.id === meta.areaId)?.name}</span>
                  {meta.teamMemberId && <span className="text-xs text-muted-foreground">({areas.find(a => a.id === meta.areaId)?.name})</span>}
                  <span className="text-xs text-muted-foreground uppercase">{getMetaLabel(meta)}</span>
                  <span className="text-sm">
                    {meta.type === 'vendas' ? `R$ ${meta.value.toLocaleString('pt-BR')}` : meta.type === 'categoria' ? `${meta.value}%` : `${meta.value} un.`}
                  </span>
                  <span className="text-xs px-2 py-1 bg-muted rounded">{validityLabels[meta.validityType]}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(meta.startDate)} - {formatDate(meta.endDate)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(meta)} className="p-2 opacity-60 hover:opacity-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMeta(meta.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>}
          </div>)}
      </div>

      {/* Expired metas */}
      {expiredMetas.length > 0 && <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Metas Expiradas ({expiredMetas.length})</p>
          {expiredMetas.map(meta => <div key={meta.id} className="flex items-center justify-between p-3 border border-black/30 bg-muted/30 opacity-60">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm">{areas.find(a => a.id === meta.areaId)?.name}</span>
                <span className="text-xs text-muted-foreground uppercase">{getMetaLabel(meta)}</span>
                <span className="text-sm">
                  {meta.type === 'vendas' ? `R$ ${meta.value.toLocaleString('pt-BR')}` : meta.type === 'categoria' ? `${meta.value}%` : `${meta.value} un.`}
                </span>
                <span className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded">Expirada</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(meta.startDate)} - {formatDate(meta.endDate)}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => {
            const dates = calculateDates(meta.validityType);
            addMeta({
              areaId: meta.areaId,
              type: meta.type,
              value: meta.value,
              categoryId: meta.categoryId,
              validityType: meta.validityType,
              startDate: dates.start,
              endDate: dates.end,
              isActive: true
            });
          }} className="text-xs px-2 py-1 border border-black hover:bg-black hover:text-white">
                  Renovar
                </button>
                <button onClick={() => deleteMeta(meta.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>)}
        </div>}
    </div>;
};
const TiposAcaoTab = () => {
  const {
    actionTypes,
    addActionType,
    updateActionType,
    deleteActionType
  } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    classification: 'relacionamento' as 'relacionamento' | 'venda' | 'projeto' | 'outro' | 'seletiva' | 'apresentacao',
    impactsMetas: [] as string[],
    requiresValue: false,
    additionalFields: false,
    enabledFields: [] as AdditionalFieldKey[],
    programPoints: 0,
    creditValidityType: 'global' as 'global' | 'mensal' | 'anual' | 'dias' | 'personalizado' | 'sem_validade',
    creditValidityDays: undefined as number | undefined
  });
  const classLabels = {
    relacionamento: 'Relacionamento',
    venda: 'Venda',
    projeto: 'Projeto',
    seletiva: 'Seletiva',
    apresentacao: 'Apresentação',
    outro: 'Outro'
  };
  const validityLabels: Record<string, string> = {
    global: 'Usar configuração global',
    mensal: 'Mensal (até o fim do mês)',
    anual: 'Anual (até o fim do ano)',
    dias: 'Por número de dias',
    personalizado: 'Personalizado (dias)',
    sem_validade: 'Sem validade'
  };
  const resetForm = () => {
    setForm({
      name: '',
      classification: 'relacionamento',
      impactsMetas: [],
      requiresValue: false,
      additionalFields: false,
      enabledFields: [],
      programPoints: 0,
      creditValidityType: 'global',
      creditValidityDays: undefined
    });
    setFormOpen(false);
    setEditingId(null);
  };
  const handleAdd = () => {
    if (form.name.trim()) {
      if (editingId) {
        updateActionType(editingId, {
          ...form,
          impactsMetas: form.impactsMetas as ('acoes' | 'vendas' | 'captacao' | 'projeto')[],
          enabledFields: form.additionalFields ? form.enabledFields : []
        });
      } else {
        addActionType({
          ...form,
          impactsMetas: form.impactsMetas as ('acoes' | 'vendas' | 'captacao' | 'projeto')[],
          enabledFields: form.additionalFields ? form.enabledFields : []
        });
      }
      resetForm();
    }
  };
  const handleEdit = (id: string) => {
    const type = actionTypes.find(t => t.id === id);
    if (type) {
      setForm({
        name: type.name,
        classification: type.classification,
        impactsMetas: type.impactsMetas,
        requiresValue: type.requiresValue,
        additionalFields: type.additionalFields,
        enabledFields: type.enabledFields || [],
        programPoints: type.programPoints,
        creditValidityType: type.creditValidityType,
        creditValidityDays: type.creditValidityDays
      });
      setEditingId(id);
      setFormOpen(true);
    }
  };
  return <div className="space-y-4">
      {!formOpen ? <button onClick={() => setFormOpen(true)} className="btn-primary bg-card-foreground text-card flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Tipo
        </button> : <div className="border border-black p-4 space-y-3">
          <input value={form.name} onChange={e => setForm({
        ...form,
        name: e.target.value
      })} placeholder="Nome" className="input-flat w-full text-card-foreground" />
          <select value={form.classification} onChange={e => setForm({
        ...form,
        classification: e.target.value as typeof form.classification
      })} className="input-flat w-full text-card-foreground">
            {Object.entries(classLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.requiresValue} onChange={e => setForm({
            ...form,
            requiresValue: e.target.checked
          })} />
              Exige valor
            </label>
            <label className="flex items-center gap-2 text-sm">

Campos 
obrigatórios<input type="checkbox" checked={form.additionalFields} onChange={e => setForm({
            ...form,
            additionalFields: e.target.checked
          })} />
              Campos adicionais
            </label>
          </div>
          
          {/* Enabled Additional Fields Selection */}
          {form.additionalFields && <div className="border border-border p-3 space-y-2 bg-muted/30">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">CAMPOS OBRIGATORIOS:</p>
              <div className="flex flex-wrap gap-4">
                {ADDITIONAL_FIELDS_CONFIG.map(({
            key,
            label
          }) => <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.enabledFields.includes(key)} onChange={e => {
              if (e.target.checked) {
                setForm({
                  ...form,
                  enabledFields: [...form.enabledFields, key]
                });
              } else {
                setForm({
                  ...form,
                  enabledFields: form.enabledFields.filter(f => f !== key)
                });
              }
            }} />
                    {label}
                  </label>)}
              </div>
            </div>}
          
          {/* Impacta Metas */}
          <div className="border-t border-border pt-3 mt-3 space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Impacta Metas</p>
            <div className="flex flex-wrap gap-4">
              {[{
            key: 'acoes',
            label: 'Ações'
          }, {
            key: 'vendas',
            label: 'Vendas'
          }, {
            key: 'captacao',
            label: 'Captação'
          }, {
            key: 'projeto',
            label: 'Projetos'
          }].map(({
            key,
            label
          }) => <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.impactsMetas.includes(key)} onChange={e => {
              if (e.target.checked) {
                setForm({
                  ...form,
                  impactsMetas: [...form.impactsMetas, key]
                });
              } else {
                setForm({
                  ...form,
                  impactsMetas: form.impactsMetas.filter(m => m !== key)
                });
              }
            }} />
                  {label}
                </label>)}
            </div>
          </div>
          
          <input type="number" value={form.programPoints} onChange={e => setForm({
        ...form,
        programPoints: Number(e.target.value)
      })} placeholder="Pontos E+" className="input-flat w-full text-card-foreground" />
          
          {/* Credit Validity Settings */}
          <div className="border-t border-border pt-3 mt-3 space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Validade dos Créditos</p>
            <select value={form.creditValidityType} onChange={e => setForm({
          ...form,
          creditValidityType: e.target.value as typeof form.creditValidityType
        })} className="input-flat w-full text-card-foreground">
              {Object.entries(validityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {(form.creditValidityType === 'dias' || form.creditValidityType === 'personalizado') && <input type="number" value={form.creditValidityDays || ''} onChange={e => setForm({
          ...form,
          creditValidityDays: e.target.value ? Number(e.target.value) : undefined
        })} placeholder="Número de dias" min="1" className="input-flat w-full text-card-foreground" />}
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">{editingId ? 'Atualizar' : 'Salvar'}</button>
            <button onClick={resetForm} className="btn-secondary border-card-foreground text-card-foreground">Cancelar</button>
          </div>
        </div>}
      <div className="space-y-2">
        {actionTypes.map(type => {
        const getValidityLabel = () => {
          if (type.creditValidityType === 'global') return 'Global';
          if (type.creditValidityType === 'mensal') return 'Mensal';
          if (type.creditValidityType === 'anual') return 'Anual';
          if (type.creditValidityType === 'dias' || type.creditValidityType === 'personalizado') {
            return `${type.creditValidityDays || 0} dias`;
          }
          if (type.creditValidityType === 'sem_validade') return 'Sem validade';
          return 'Global';
        };
        return <div key={type.id} className="flex items-center justify-between p-3 border border-black">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium">{type.name}</span>
                <span className="text-xs text-muted-foreground uppercase">{classLabels[type.classification]}</span>
                <span className="text-xs text-muted-foreground">{type.programPoints} pts</span>
                <span className="text-xs px-2 py-0.5 bg-muted rounded-sm text-muted-foreground">
                  Validade: {getValidityLabel()}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(type.id)} className="p-2 opacity-60 hover:opacity-100">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteActionType(type.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>;
      })}
      </div>
    </div>;
};
const ProgramaTab = () => {
  const {
    rewards,
    addReward,
    updateReward,
    deleteReward,
    creditValiditySettings,
    updateCreditValiditySettings
  } = useApp();
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    cost: ''
  });
  const [validityType, setValidityType] = useState(creditValiditySettings.type);
  const [validityDays, setValidityDays] = useState(String(creditValiditySettings.days || 30));
  const handleAdd = () => {
    if (newName.trim() && newCost) {
      addReward({
        name: newName.trim(),
        cost: Number(newCost)
      });
      setNewName('');
      setNewCost('');
    }
  };
  const handleEdit = (id: string) => {
    const reward = rewards.find(r => r.id === id);
    if (reward) {
      setEditForm({
        name: reward.name,
        cost: String(reward.cost)
      });
      setEditingId(id);
    }
  };
  const handleSaveEdit = () => {
    if (editingId && editForm.name.trim() && editForm.cost) {
      updateReward(editingId, {
        name: editForm.name.trim(),
        cost: Number(editForm.cost)
      });
      setEditingId(null);
    }
  };
  const handleSaveValiditySettings = () => {
    updateCreditValiditySettings({
      type: validityType,
      days: validityType === 'dias' ? Number(validityDays) : undefined
    });
  };
  const validityTypeLabels: Record<string, string> = {
    mensal: 'Mensal (até o fim do mês)',
    anual: 'Anual (até o fim do ano)',
    dias: 'Por número de dias',
    sem_validade: 'Sem validade'
  };
  return <div className="space-y-6">
      {/* Credit Validity Settings */}
      <div className="space-y-4 border border-black p-4">
        <p className="title-section">Validade dos Créditos</p>
        <p className="text-xs text-muted-foreground">
          Configure a regra de expiração dos créditos gerados. A regra se aplica apenas a novos créditos.
        </p>
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground block mb-1">Tipo de Validade</label>
            <select value={validityType} onChange={e => setValidityType(e.target.value as typeof validityType)} className="input-flat w-full text-card-foreground">
              {Object.entries(validityTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {validityType === 'dias' && <div className="w-32">
              <label className="text-xs text-muted-foreground block mb-1">Dias</label>
              <input type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} min="1" className="input-flat w-full text-card-foreground" />
            </div>}
          <button onClick={handleSaveValiditySettings} className="btn-primary bg-card-foreground text-card">
            Salvar Regra
          </button>
        </div>
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>Regra atual:</strong> {validityTypeLabels[creditValiditySettings.type]}
          {creditValiditySettings.type === 'dias' && creditValiditySettings.days && <span> ({creditValiditySettings.days} dias)</span>}
        </div>
      </div>

      {/* Rewards */}
      <div className="space-y-4">
        <p className="title-section">Premiações</p>
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da premiação" className="input-flat flex-1 text-card-foreground" />
          <input type="number" value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="Custo" className="input-flat w-24 text-card-foreground" />
          <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {rewards.map(reward => <div key={reward.id} className="flex items-center justify-between p-3 border border-black">
              {editingId === reward.id ? <>
                  <div className="flex items-center gap-2 flex-1">
                    <input value={editForm.name} onChange={e => setEditForm({
                ...editForm,
                name: e.target.value
              })} className="input-flat flex-1 text-card-foreground" />
                    <input type="number" value={editForm.cost} onChange={e => setEditForm({
                ...editForm,
                cost: e.target.value
              })} className="input-flat w-24 text-card-foreground" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={handleSaveEdit} className="p-2">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </> : <>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{reward.name}</span>
                    <span className="text-xs text-muted-foreground">{reward.cost} créditos</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(reward.id)} className="p-2 opacity-60 hover:opacity-100">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteReward(reward.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>}
            </div>)}
        </div>
      </div>
    </div>;
};
const TiposProfTab = () => {
  const {
    professionalTypes,
    addProfessionalType,
    updateProfessionalType,
    deleteProfessionalType
  } = useApp();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const handleAdd = () => {
    if (newName.trim()) {
      addProfessionalType({
        name: newName.trim()
      });
      setNewName('');
    }
  };
  const handleEdit = (id: string) => {
    const type = professionalTypes.find(t => t.id === id);
    if (type) {
      setEditName(type.name);
      setEditingId(id);
    }
  };
  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      updateProfessionalType(editingId, {
        name: editName.trim()
      });
      setEditingId(null);
    }
  };
  return <div className="space-y-4">
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Novo tipo" className="input-flat flex-1 text-card-foreground" />
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {professionalTypes.map(type => <div key={type.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === type.id ? <>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="input-flat flex-1 mr-2 text-card-foreground" />
                <div className="flex gap-1">
                  <button onClick={handleSaveEdit} className="p-2">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </> : <>
                <span className="text-sm">{type.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(type.id)} className="p-2 opacity-60 hover:opacity-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteProfessionalType(type.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>}
          </div>)}
      </div>
    </div>;
};
const CategoriasTab = () => {
  const {
    professionalCategories,
    addProfessionalCategory,
    updateProfessionalCategory,
    deleteProfessionalCategory
  } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    condition: 'relacionamento' as 'relacionamento' | 'venda' | 'projeto' | 'outro',
    daysToChange: 30
  });
  const condLabels = {
    relacionamento: 'Relacionamento',
    venda: 'Venda',
    projeto: 'Projeto',
    outro: 'Outro'
  };
  const resetForm = () => {
    setForm({
      name: '',
      condition: 'relacionamento',
      daysToChange: 30
    });
    setFormOpen(false);
    setEditingId(null);
  };
  const handleAdd = () => {
    if (form.name.trim()) {
      if (editingId) {
        updateProfessionalCategory(editingId, form);
      } else {
        addProfessionalCategory({
          ...form,
          order: professionalCategories.length + 1
        });
      }
      resetForm();
    }
  };
  const handleEdit = (id: string) => {
    const cat = professionalCategories.find(c => c.id === id);
    if (cat) {
      setForm({
        name: cat.name,
        condition: cat.condition,
        daysToChange: cat.daysToChange
      });
      setEditingId(id);
      setFormOpen(true);
    }
  };
  return <div className="space-y-4">
      {!formOpen ? <button onClick={() => setFormOpen(true)} className="btn-primary bg-card-foreground text-card flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Categoria
        </button> : <div className="border border-black p-4 space-y-3">
          <input value={form.name} onChange={e => setForm({
        ...form,
        name: e.target.value
      })} placeholder="Nome" className="input-flat w-full text-card-foreground" />
          <select value={form.condition} onChange={e => setForm({
        ...form,
        condition: e.target.value as typeof form.condition
      })} className="input-flat w-full text-card-foreground">
            {Object.entries(condLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" value={form.daysToChange} onChange={e => setForm({
        ...form,
        daysToChange: Number(e.target.value)
      })} placeholder="Dias para mudar" className="input-flat w-full text-card-foreground" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">{editingId ? 'Atualizar' : 'Salvar'}</button>
            <button onClick={resetForm} className="btn-secondary border-card-foreground text-card-foreground">Cancelar</button>
          </div>
        </div>}
      <div className="space-y-2">
        {professionalCategories.sort((a, b) => a.order - b.order).map(cat => <div key={cat.id} className="flex items-center justify-between p-3 border border-black">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">#{cat.order}</span>
              <span className="text-sm">{cat.name}</span>
              <span className="text-xs text-muted-foreground uppercase">{condLabels[cat.condition]}</span>
              <span className="text-xs text-muted-foreground">{cat.daysToChange} dias</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(cat.id)} className="p-2 opacity-60 hover:opacity-100">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => deleteProfessionalCategory(cat.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>)}
      </div>
    </div>;
};
interface ImportRow {
  name: string;
  typeName: string;
  consultantName: string;
  lastActionDate?: string;
  lastActionName?: string;
  isValid: boolean;
  errors: string[];
  typeId?: string;
  consultantId?: string;
  categoryId?: string;
  lastActionTypeId?: string;
}
const ImportacaoTab = () => {
  const {
    professionalTypes,
    teamMembers,
    professionalCategories,
    actionTypes,
    addProfessional
  } = useApp();
  const [activeInputTab, setActiveInputTab] = useState<'manual' | 'file'>('manual');
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [manualText, setManualText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeMembers = teamMembers.filter(m => m.active);
  const sortedCategories = useMemo(() => [...professionalCategories].sort((a, b) => a.order - b.order), [professionalCategories]);
  const defaultCategoryId = sortedCategories[sortedCategories.length - 1]?.id || '';
  const parseDate = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    const formats = [/^(\d{2})\/(\d{2})\/(\d{4})$/, /^(\d{2})-(\d{2})-(\d{4})$/, /^(\d{4})-(\d{2})-(\d{2})$/];
    for (const pattern of formats) {
      const match = dateStr.match(pattern);
      if (match) {
        if (pattern === formats[2]) {
          return dateStr;
        }
        const [, day, month, year] = match;
        const isoDate = `${year}-${month}-${day}`;
        if (isValid(parseISO(isoDate))) {
          return isoDate;
        }
      }
    }
    return undefined;
  };
  const processRow = (name: string, typeName: string, consultantName: string, lastActionDateStr?: string, lastActionNameStr?: string): ImportRow => {
    const errors: string[] = [];
    const trimmedName = name.trim();
    const trimmedType = typeName.trim();
    const trimmedConsultant = consultantName.trim();
    const trimmedLastAction = lastActionNameStr?.trim() || '';
    if (!trimmedName) errors.push('Nome obrigatório');
    if (!trimmedType) errors.push('Tipo obrigatório');
    const matchedType = professionalTypes.find(t => t.name.toLowerCase() === trimmedType.toLowerCase());
    if (trimmedType && !matchedType) {
      errors.push(`Tipo "${trimmedType}" não encontrado`);
    }
    const matchedConsultant = activeMembers.find(m => m.name.toLowerCase() === trimmedConsultant.toLowerCase());
    let parsedDate: string | undefined;
    if (lastActionDateStr) {
      parsedDate = parseDate(lastActionDateStr.trim());
      if (!parsedDate) {
        errors.push('Formato de data inválido');
      }
    }
    let matchedActionType;
    if (trimmedLastAction) {
      matchedActionType = actionTypes.find(at => at.name.toLowerCase() === trimmedLastAction.toLowerCase());
      if (!matchedActionType) {
        errors.push(`Ação "${trimmedLastAction}" não encontrada`);
      }
    }
    let categoryId = defaultCategoryId;
    if (parsedDate && matchedActionType) {
      const matchedCategory = getCategoryForAction(matchedActionType, professionalCategories);
      if (matchedCategory) {
        categoryId = matchedCategory.id;
      }
    }
    return {
      name: trimmedName,
      typeName: trimmedType,
      consultantName: trimmedConsultant,
      lastActionDate: parsedDate,
      lastActionName: trimmedLastAction,
      isValid: errors.length === 0,
      errors,
      typeId: matchedType?.id,
      consultantId: matchedConsultant?.id,
      categoryId,
      lastActionTypeId: matchedActionType?.id
    };
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array'
        });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          raw: false
        });
        const processedData: ImportRow[] = jsonData.map(row => {
          const name = (row['Nome'] || row['nome'] || row['NOME'] || '').toString();
          const typeName = (row['Tipo'] || row['tipo'] || row['TIPO'] || '').toString();
          const consultantName = (row['Consultor'] || row['consultor'] || row['CONSULTOR'] || '').toString();
          const lastActionDate = (row['Data da Última Ação'] || row['data da última ação'] || row['Data Última Ação'] || row['Última Ação Data'] || '').toString();
          const lastActionName = (row['Última Ação'] || row['última ação'] || row['ÚLTIMA AÇÃO'] || row['Tipo Ação'] || '').toString();
          return processRow(name, typeName, consultantName, lastActionDate, lastActionName);
        });
        setImportData(processedData);
        setImportComplete(false);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Erro ao ler o arquivo. Verifique se é um arquivo Excel ou CSV válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const handleManualParse = () => {
    if (!manualText.trim()) return;
    const lines = manualText.trim().split('\n');
    const processedData: ImportRow[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      let parts: string[];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        parts = [line];
      }
      const [name = '', typeName = '', consultantName = '', lastActionDate = '', lastActionName = ''] = parts;
      processedData.push(processRow(name, typeName, consultantName, lastActionDate, lastActionName));
    }
    setImportData(processedData);
    setImportComplete(false);
  };
  const handleImport = async () => {
    const validRows = importData.filter(row => row.isValid);
    if (validRows.length === 0) return;
    setIsProcessing(true);
    let count = 0;
    for (const row of validRows) {
      if (row.typeId) {
        await addProfessional({
          name: row.name,
          typeId: row.typeId,
          consultantId: row.consultantId || '',
          categoryId: row.categoryId || defaultCategoryId,
          lastActionDate: row.lastActionDate,
          lastActionTypeId: row.lastActionTypeId
        });
        count++;
      }
    }
    setImportedCount(count);
    setImportComplete(true);
    setIsProcessing(false);
  };
  const handleReset = () => {
    setImportData([]);
    setManualText('');
    setImportComplete(false);
    setImportedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const validCount = importData.filter(r => r.isValid).length;
  const invalidCount = importData.filter(r => !r.isValid).length;
  const formatLastActionDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };
  if (importComplete) {
    return <div className="text-center py-8 space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h3 className="text-lg font-medium">Importação Concluída!</h3>
        <p className="text-muted-foreground">
          {importedCount} profissional(is) adicionado(s) com sucesso.
        </p>
        <button onClick={handleReset} className="btn-secondary border-card-foreground text-card-foreground">
          Nova Importação
        </button>
      </div>;
  }
  return <div className="space-y-4">
      {/* Instructions */}
      <div className="border border-black/20 p-4 space-y-3">
        <h3 className="text-sm font-medium">Estrutura dos dados:</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-medium text-muted-foreground mb-1">Campos obrigatórios:</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>• <strong>Nome</strong> - Nome completo</li>
              <li>• <strong>Tipo</strong> - Tipo do profissional</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-muted-foreground mb-1">Campos opcionais:</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>• <strong>Consultor</strong> - Responsável</li>
              <li>• <strong>Data da Última Ação</strong> - Para categorização</li>
              <li>• <strong>Última Ação</strong> - Tipo da última ação</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs mt-2 pt-2 border-t border-black/10">
          <div>
            <span className="text-muted-foreground font-medium">Tipos disponíveis:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {professionalTypes.map(t => <span key={t.id} className="bg-muted px-1.5 py-0.5 text-[10px]">{t.name}</span>)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">Consultores ativos:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {activeMembers.map(m => <span key={m.id} className="bg-muted px-1.5 py-0.5 text-[10px]">{m.name}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for input method */}
      <Tabs value={activeInputTab} onValueChange={v => {
      setActiveInputTab(v as 'manual' | 'file');
      setImportData([]);
    }}>
        <TabsList className="w-full grid grid-cols-2 bg-muted">
          <TabsTrigger value="manual" className="flex items-center gap-2 data-[state=active]:bg-card-foreground data-[state=active]:text-card">
            <ClipboardList className="w-4 h-4" />
            Listagem Manual
          </TabsTrigger>
          <TabsTrigger value="file" className="flex items-center gap-2 data-[state=active]:bg-card-foreground data-[state=active]:text-card">
            <FileUp className="w-4 h-4" />
            Importar Arquivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4 space-y-3">
          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
              Cole a lista de profissionais (um por linha, separado por vírgula, tab ou ponto e vírgula)
            </label>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Nome, Tipo, Consultor, Data Última Ação, Última Ação
João Silva, Arquiteto, Maria Santos, 15/01/2025, Visita
Ana Costa, Designer
Pedro Lima, Engenheiro, Carlos Souza" className="input-flat w-full h-32 text-sm font-mono resize-none" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Formato: Nome, Tipo, Consultor (opcional), Data (opcional), Ação (opcional)
            </p>
          </div>
          <button onClick={handleManualParse} disabled={!manualText.trim()} className="btn-secondary border-card-foreground text-card-foreground disabled:opacity-40">
            Validar Dados
          </button>
        </TabsContent>

        <TabsContent value="file" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="setup-bulk-file-upload" />
            <label htmlFor="setup-bulk-file-upload" className="btn-secondary border-card-foreground text-card-foreground flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Selecionar Arquivo (.CSV ou .XLSX)
            </label>
            {importData.length > 0 && <span className="text-sm text-muted-foreground">
                {importData.length} linha(s) encontrada(s)
              </span>}
          </div>
          <p className="text-xs text-muted-foreground">
            Colunas do arquivo: Nome, Tipo, Consultor, Data da Última Ação, Última Ação
          </p>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {importData.length > 0 && <div className="space-y-3 mt-4 pt-4 border-t border-black/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Pré-visualização</h4>
            <div className="flex items-center gap-4">
              <span className="text-sm">
                <Check className="w-4 h-4 inline text-green-600 mr-1" />
                {validCount} válido(s)
              </span>
              {invalidCount > 0 && <span className="text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  {invalidCount} com erro(s)
                </span>}
            </div>
          </div>

          <div className="border border-black overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr className="border-b border-black">
                  <th className="text-left p-2 w-8"></th>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Consultor</th>
                  <th className="text-left p-2">Últ. Ação</th>
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {importData.map((row, idx) => <tr key={idx} className={`border-b border-black/10 ${!row.isValid ? 'bg-destructive/10' : ''}`}>
                    <td className="p-2">
                      {row.isValid ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-destructive" />}
                    </td>
                    <td className="p-2 font-medium">{row.name || '-'}</td>
                    <td className="p-2">{row.typeName || '-'}</td>
                    <td className="p-2">{row.consultantName || <span className="text-muted-foreground italic">-</span>}</td>
                    <td className="p-2">{row.lastActionName || <span className="text-muted-foreground italic">-</span>}</td>
                    <td className="p-2">{formatLastActionDate(row.lastActionDate)}</td>
                    <td className="p-2">
                      {row.isValid ? <span className="text-green-600">OK</span> : <span className="text-destructive text-[10px]">{row.errors.join(', ')}</span>}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleImport} disabled={validCount === 0 || isProcessing} className="btn-primary bg-card-foreground text-card disabled:opacity-40 flex items-center gap-2">
              {isProcessing ? 'Importando...' : `Confirmar Cadastro (${validCount})`}
            </button>
            <button onClick={handleReset} className="btn-secondary border-card-foreground text-card-foreground">
              Limpar
            </button>
          </div>
        </div>}
    </div>;
};