import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface SetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetupModal({ open, onOpenChange }: SetupModalProps) {
  // No more password authentication - access is controlled by isAdmin in Layout
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card text-card-foreground border-black max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>SETUP</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="areas" className="h-full">
          <TabsList className="bg-transparent border-b border-black rounded-none w-full justify-start gap-0 h-auto p-0">
            {['Áreas', 'Equipe', 'Metas', 'Tipos de Ação', 'Programa E+', 'Tipos Prof.', 'Categorias'].map((tab, i) => (
              <TabsTrigger
                key={tab}
                value={['areas', 'equipe', 'metas', 'tipos-acao', 'programa', 'tipos-prof', 'categorias'][i]}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent text-xs tracking-widest uppercase px-4 py-3"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="overflow-y-auto max-h-[60vh] py-4">
            <TabsContent value="areas"><AreasTab /></TabsContent>
            <TabsContent value="equipe"><EquipeTab /></TabsContent>
            <TabsContent value="metas"><MetasTab /></TabsContent>
            <TabsContent value="tipos-acao"><TiposAcaoTab /></TabsContent>
            <TabsContent value="programa"><ProgramaTab /></TabsContent>
            <TabsContent value="tipos-prof"><TiposProfTab /></TabsContent>
            <TabsContent value="categorias"><CategoriasTab /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

const AreasTab = () => {
  const { areas, addArea, updateArea, deleteArea } = useApp();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      addArea({ name: newName.trim() });
      setNewName('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova área"
          className="input-flat flex-1 text-card-foreground"
        />
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {areas.map((area) => (
          <div key={area.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === area.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-flat flex-1 mr-2 text-card-foreground"
                />
                <button onClick={() => { updateArea(area.id, { name: editName }); setEditingId(null); }} className="p-2">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-sm">{area.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(area.id); setEditName(area.name); }} className="p-2 opacity-60 hover:opacity-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteArea(area.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const EquipeTab = () => {
  const { teamMembers, areas, addTeamMember, updateTeamMember, deleteTeamMember } = useApp();
  const [newName, setNewName] = useState('');
  const [newAreaId, setNewAreaId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', areaId: '' });

  const handleAdd = () => {
    if (newName.trim() && newAreaId) {
      addTeamMember({ name: newName.trim(), areaId: newAreaId, active: true });
      setNewName('');
      setNewAreaId('');
    }
  };

  const handleEdit = (id: string) => {
    const member = teamMembers.find(m => m.id === id);
    if (member) {
      setEditForm({ name: member.name, areaId: member.areaId });
      setEditingId(id);
    }
  };

  const handleSaveEdit = () => {
    if (editingId && editForm.name.trim()) {
      updateTeamMember(editingId, { name: editForm.name.trim(), areaId: editForm.areaId });
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome"
          className="input-flat flex-1 text-card-foreground"
        />
        <select
          value={newAreaId}
          onChange={(e) => setNewAreaId(e.target.value)}
          className="input-flat text-card-foreground"
        >
          <option value="">Área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {teamMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === member.id ? (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="input-flat flex-1 text-card-foreground"
                  />
                  <select
                    value={editForm.areaId}
                    onChange={(e) => setEditForm({ ...editForm, areaId: e.target.value })}
                    className="input-flat text-card-foreground"
                  >
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
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
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{areas.find(a => a.id === member.areaId)?.name}</span>
                  <button
                    onClick={() => updateTeamMember(member.id, { active: !member.active })}
                    className={`text-xs px-2 py-1 border ${member.active ? 'border-success text-success' : 'border-muted-foreground text-muted-foreground'}`}
                  >
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const MetasTab = () => {
  const { metas, areas, professionalCategories, addMeta, updateMeta, deleteMeta } = useApp();
  const [newAreaId, setNewAreaId] = useState('');
  const [newType, setNewType] = useState<'acoes' | 'vendas' | 'captacao' | 'projeto' | 'categoria'>('acoes');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newAreaId && newValue) {
      if (newType === 'categoria' && !newCategoryId) return;
      addMeta({ 
        areaId: newAreaId, 
        type: newType, 
        value: Number(newValue),
        ...(newType === 'categoria' ? { categoryId: newCategoryId } : {})
      });
      setNewValue('');
      setNewCategoryId('');
    }
  };

  const typeLabels: Record<string, string> = { 
    acoes: 'Ações', 
    vendas: 'Vendas', 
    captacao: 'Captação', 
    projeto: 'Projeto',
    categoria: '% Categoria'
  };

  const getMetaLabel = (meta: typeof metas[0]) => {
    if (meta.type === 'categoria' && meta.categoryId) {
      const cat = professionalCategories.find(c => c.id === meta.categoryId);
      return `% ${cat?.name || 'Categoria'}`;
    }
    return typeLabels[meta.type];
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <select value={newAreaId} onChange={(e) => setNewAreaId(e.target.value)} className="input-flat text-card-foreground">
          <option value="">Área</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
        <select value={newType} onChange={(e) => setNewType(e.target.value as typeof newType)} className="input-flat text-card-foreground">
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {newType === 'categoria' && (
          <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} className="input-flat text-card-foreground">
            <option value="">Selecione a Categoria</option>
            {professionalCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        )}
        <div className="relative">
          {newType === 'vendas' && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
          )}
          <input
            type="number"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={newType === 'vendas' ? 'Valor R$' : newType === 'categoria' ? 'Valor %' : 'Quantidade'}
            className={`input-flat w-32 text-card-foreground ${newType === 'vendas' ? 'pl-10' : ''}`}
          />
        </div>
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {metas.map((meta) => (
          <div key={meta.id} className="flex items-center justify-between p-3 border border-black">
            <div className="flex items-center gap-4">
              <span className="text-sm">{areas.find(a => a.id === meta.areaId)?.name}</span>
              <span className="text-xs text-muted-foreground uppercase">{getMetaLabel(meta)}</span>
              <div className="relative">
                {meta.type === 'vendas' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                )}
                <input
                  type="number"
                  value={meta.value}
                  onChange={(e) => updateMeta(meta.id, { value: Number(e.target.value) })}
                  className={`input-flat w-32 text-card-foreground ${meta.type === 'vendas' ? 'pl-10' : ''}`}
                />
                {meta.type !== 'vendas' && meta.type !== 'categoria' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">un.</span>
                )}
                {meta.type === 'categoria' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                )}
              </div>
            </div>
            <button onClick={() => deleteMeta(meta.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const TiposAcaoTab = () => {
  const { actionTypes, addActionType, updateActionType, deleteActionType } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    classification: 'relacionamento' as 'relacionamento' | 'venda' | 'projeto' | 'outro',
    impactsMetas: [] as string[],
    requiresValue: false,
    additionalFields: false,
    programPoints: 0,
  });

  const classLabels = { relacionamento: 'Relacionamento', venda: 'Venda', projeto: 'Projeto', outro: 'Outro' };

  const resetForm = () => {
    setForm({ name: '', classification: 'relacionamento', impactsMetas: [], requiresValue: false, additionalFields: false, programPoints: 0 });
    setFormOpen(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (form.name.trim()) {
      if (editingId) {
        updateActionType(editingId, {
          ...form,
          impactsMetas: form.impactsMetas as ('acoes' | 'vendas' | 'captacao' | 'projeto')[],
        });
      } else {
        addActionType({
          ...form,
          impactsMetas: form.impactsMetas as ('acoes' | 'vendas' | 'captacao' | 'projeto')[],
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
        programPoints: type.programPoints,
      });
      setEditingId(id);
      setFormOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {!formOpen ? (
        <button onClick={() => setFormOpen(true)} className="btn-primary bg-card-foreground text-card flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Tipo
        </button>
      ) : (
        <div className="border border-black p-4 space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="input-flat w-full text-card-foreground" />
          <select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value as typeof form.classification })} className="input-flat w-full text-card-foreground">
            {Object.entries(classLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.requiresValue} onChange={(e) => setForm({ ...form, requiresValue: e.target.checked })} />
              Exige valor
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.additionalFields} onChange={(e) => setForm({ ...form, additionalFields: e.target.checked })} />
              Campos adicionais
            </label>
          </div>
          <input type="number" value={form.programPoints} onChange={(e) => setForm({ ...form, programPoints: Number(e.target.value) })} placeholder="Pontos E+" className="input-flat w-full text-card-foreground" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">{editingId ? 'Atualizar' : 'Salvar'}</button>
            <button onClick={resetForm} className="btn-secondary border-card-foreground text-card-foreground">Cancelar</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {actionTypes.map((type) => (
          <div key={type.id} className="flex items-center justify-between p-3 border border-black">
            <div className="flex items-center gap-4">
              <span className="text-sm">{type.name}</span>
              <span className="text-xs text-muted-foreground uppercase">{classLabels[type.classification]}</span>
              <span className="text-xs text-muted-foreground">{type.programPoints} pts</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(type.id)} className="p-2 opacity-60 hover:opacity-100">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => deleteActionType(type.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ProgramaTab = () => {
  const { rewards, addReward, updateReward, deleteReward } = useApp();
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', cost: '' });

  const handleAdd = () => {
    if (newName.trim() && newCost) {
      addReward({ name: newName.trim(), cost: Number(newCost) });
      setNewName('');
      setNewCost('');
    }
  };

  const handleEdit = (id: string) => {
    const reward = rewards.find(r => r.id === id);
    if (reward) {
      setEditForm({ name: reward.name, cost: String(reward.cost) });
      setEditingId(id);
    }
  };

  const handleSaveEdit = () => {
    if (editingId && editForm.name.trim() && editForm.cost) {
      updateReward(editingId, { name: editForm.name.trim(), cost: Number(editForm.cost) });
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="title-section">Premiações</p>
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da premiação" className="input-flat flex-1 text-card-foreground" />
        <input type="number" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="Custo" className="input-flat w-24 text-card-foreground" />
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {rewards.map((reward) => (
          <div key={reward.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === reward.id ? (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="input-flat flex-1 text-card-foreground"
                  />
                  <input
                    type="number"
                    value={editForm.cost}
                    onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                    className="input-flat w-24 text-card-foreground"
                  />
                </div>
                <div className="flex gap-1">
                  <button onClick={handleSaveEdit} className="p-2">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TiposProfTab = () => {
  const { professionalTypes, addProfessionalType, updateProfessionalType, deleteProfessionalType } = useApp();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      addProfessionalType({ name: newName.trim() });
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
      updateProfessionalType(editingId, { name: editName.trim() });
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Novo tipo" className="input-flat flex-1 text-card-foreground" />
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {professionalTypes.map((type) => (
          <div key={type.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === type.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-flat flex-1 mr-2 text-card-foreground"
                />
                <div className="flex gap-1">
                  <button onClick={handleSaveEdit} className="p-2">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm">{type.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(type.id)} className="p-2 opacity-60 hover:opacity-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteProfessionalType(type.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const CategoriasTab = () => {
  const { professionalCategories, addProfessionalCategory, updateProfessionalCategory, deleteProfessionalCategory } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', condition: 'relacionamento' as 'relacionamento' | 'venda' | 'projeto' | 'outro', daysToChange: 30 });

  const condLabels = { relacionamento: 'Relacionamento', venda: 'Venda', projeto: 'Projeto', outro: 'Outro' };

  const resetForm = () => {
    setForm({ name: '', condition: 'relacionamento', daysToChange: 30 });
    setFormOpen(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (form.name.trim()) {
      if (editingId) {
        updateProfessionalCategory(editingId, form);
      } else {
        addProfessionalCategory({ ...form, order: professionalCategories.length + 1 });
      }
      resetForm();
    }
  };

  const handleEdit = (id: string) => {
    const cat = professionalCategories.find(c => c.id === id);
    if (cat) {
      setForm({ name: cat.name, condition: cat.condition, daysToChange: cat.daysToChange });
      setEditingId(id);
      setFormOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {!formOpen ? (
        <button onClick={() => setFormOpen(true)} className="btn-primary bg-card-foreground text-card flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      ) : (
        <div className="border border-black p-4 space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="input-flat w-full text-card-foreground" />
          <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as typeof form.condition })} className="input-flat w-full text-card-foreground">
            {Object.entries(condLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" value={form.daysToChange} onChange={(e) => setForm({ ...form, daysToChange: Number(e.target.value) })} placeholder="Dias para mudar" className="input-flat w-full text-card-foreground" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">{editingId ? 'Atualizar' : 'Salvar'}</button>
            <button onClick={resetForm} className="btn-secondary border-card-foreground text-card-foreground">Cancelar</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {professionalCategories.sort((a, b) => a.order - b.order).map((cat) => (
          <div key={cat.id} className="flex items-center justify-between p-3 border border-black">
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
          </div>
        ))}
      </div>
    </div>
  );
}
