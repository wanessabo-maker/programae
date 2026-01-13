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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Senha incorreta');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setIsAuthenticated(false);
    setPassword('');
    setError('');
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card text-card-foreground border-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">SETUP</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-xs tracking-widest uppercase text-center text-muted-foreground">
              Digite a senha de administrador
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="input-flat w-full text-card-foreground"
              placeholder="Senha"
            />
            {error && <p className="text-destructive text-xs text-center">{error}</p>}
            <button onClick={handleLogin} className="btn-primary w-full bg-card-foreground text-card">
              Entrar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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

function AreasTab() {
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

function EquipeTab() {
  const { teamMembers, areas, addTeamMember, updateTeamMember, deleteTeamMember } = useApp();
  const [newName, setNewName] = useState('');
  const [newAreaId, setNewAreaId] = useState('');

  const handleAdd = () => {
    if (newName.trim() && newAreaId) {
      addTeamMember({ name: newName.trim(), areaId: newAreaId, active: true });
      setNewName('');
      setNewAreaId('');
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
            <button onClick={() => deleteTeamMember(member.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetasTab() {
  const { metas, areas, addMeta, updateMeta, deleteMeta } = useApp();
  const [newAreaId, setNewAreaId] = useState('');
  const [newType, setNewType] = useState<'acoes' | 'vendas' | 'captacao' | 'projeto'>('acoes');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newAreaId && newValue) {
      addMeta({ areaId: newAreaId, type: newType, value: Number(newValue) });
      setNewValue('');
    }
  };

  const typeLabels = { acoes: 'Ações', vendas: 'Vendas', captacao: 'Captação', projeto: 'Projeto' };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select value={newAreaId} onChange={(e) => setNewAreaId(e.target.value)} className="input-flat text-card-foreground">
          <option value="">Área</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
        <select value={newType} onChange={(e) => setNewType(e.target.value as typeof newType)} className="input-flat text-card-foreground">
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input
          type="number"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Valor"
          className="input-flat w-32 text-card-foreground"
        />
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {metas.map((meta) => (
          <div key={meta.id} className="flex items-center justify-between p-3 border border-black">
            <div className="flex items-center gap-4">
              <span className="text-sm">{areas.find(a => a.id === meta.areaId)?.name}</span>
              <span className="text-xs text-muted-foreground uppercase">{typeLabels[meta.type]}</span>
              <input
                type="number"
                value={meta.value}
                onChange={(e) => updateMeta(meta.id, { value: Number(e.target.value) })}
                className="input-flat w-32 text-card-foreground"
              />
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

function TiposAcaoTab() {
  const { actionTypes, addActionType, deleteActionType } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    classification: 'relacionamento' as const,
    impactsMetas: [] as string[],
    requiresValue: false,
    additionalFields: false,
    programPoints: 0,
  });

  const handleAdd = () => {
    if (form.name.trim()) {
      addActionType({
        ...form,
        impactsMetas: form.impactsMetas as ('acoes' | 'vendas' | 'captacao' | 'projeto')[],
      });
      setForm({ name: '', classification: 'relacionamento', impactsMetas: [], requiresValue: false, additionalFields: false, programPoints: 0 });
      setFormOpen(false);
    }
  };

  const classLabels = { relacionamento: 'Relacionamento', venda: 'Venda', projeto: 'Projeto', outro: 'Outro' };

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
            <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">Salvar</button>
            <button onClick={() => setFormOpen(false)} className="btn-secondary border-card-foreground text-card-foreground">Cancelar</button>
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
            <button onClick={() => deleteActionType(type.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgramaTab() {
  const { rewards, addReward, deleteReward } = useApp();
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');

  const handleAdd = () => {
    if (newName.trim() && newCost) {
      addReward({ name: newName.trim(), cost: Number(newCost) });
      setNewName('');
      setNewCost('');
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
            <div className="flex items-center gap-4">
              <span className="text-sm">{reward.name}</span>
              <span className="text-xs text-muted-foreground">{reward.cost} créditos</span>
            </div>
            <button onClick={() => deleteReward(reward.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TiposProfTab() {
  const { professionalTypes, addProfessionalType, deleteProfessionalType } = useApp();
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      addProfessionalType({ name: newName.trim() });
      setNewName('');
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
            <span className="text-sm">{type.name}</span>
            <button onClick={() => deleteProfessionalType(type.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriasTab() {
  const { professionalCategories, addProfessionalCategory, updateProfessionalCategory, deleteProfessionalCategory } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', condition: 'relacionamento' as const, daysToChange: 30 });

  const handleAdd = () => {
    if (form.name.trim()) {
      addProfessionalCategory({ ...form, order: professionalCategories.length + 1 });
      setForm({ name: '', condition: 'relacionamento', daysToChange: 30 });
      setFormOpen(false);
    }
  };

  const condLabels = { relacionamento: 'Relacionamento', venda: 'Venda', projeto: 'Projeto', outro: 'Outro' };

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
            <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">Salvar</button>
            <button onClick={() => setFormOpen(false)} className="btn-secondary border-card-foreground text-card-foreground">Cancelar</button>
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
              <input
                type="number"
                value={cat.daysToChange}
                onChange={(e) => updateProfessionalCategory(cat.id, { daysToChange: Number(e.target.value) })}
                className="input-flat w-20 text-card-foreground"
              />
              <span className="text-xs text-muted-foreground">dias</span>
            </div>
            <button onClick={() => deleteProfessionalCategory(cat.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
