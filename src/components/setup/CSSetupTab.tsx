import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import {
  useCSContactSchedules,
  useCreateCSContactSchedule,
  useUpdateCSContactSchedule,
  useDeleteCSContactSchedule,
  useCSActionTypes,
  useCreateCSActionType,
  useUpdateCSActionType,
  useDeleteCSActionType,
} from '@/hooks/useCustomerSuccess';

export function CSSetupTab() {
  return (
    <div className="space-y-8">
      <PeriodicidadeSection />
      <TiposAcaoCSSection />
    </div>
  );
}

// =============================================
// Periodicidade de Contato
// =============================================

function PeriodicidadeSection() {
  const { data: schedules = [], isLoading } = useCSContactSchedules();
  const createMutation = useCreateCSContactSchedule();
  const updateMutation = useUpdateCSContactSchedule();
  const deleteMutation = useDeleteCSContactSchedule();

  const [newName, setNewName] = useState('');
  const [newDays, setNewDays] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', days: '', description: '' });

  const handleAdd = () => {
    if (newName.trim() && newDays) {
      createMutation.mutate({
        name: newName.trim(),
        days_after_signature: parseInt(newDays),
        description: newDescription.trim() || null,
        is_active: true,
        sort_order: schedules.length,
      });
      setNewName('');
      setNewDays('');
      setNewDescription('');
    }
  };

  const handleEdit = (schedule: typeof schedules[0]) => {
    setEditForm({
      name: schedule.name,
      days: String(schedule.days_after_signature),
      description: schedule.description || '',
    });
    setEditingId(schedule.id);
  };

  const handleSaveEdit = () => {
    if (editingId && editForm.name.trim() && editForm.days) {
      updateMutation.mutate({
        id: editingId,
        name: editForm.name.trim(),
        days_after_signature: parseInt(editForm.days),
        description: editForm.description.trim() || null,
      });
      setEditingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-black pb-2">
        <h3 className="text-xs uppercase tracking-widest font-semibold">Periodicidade de Contato</h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Define os prazos automáticos para ações de CS após assinatura do certificado
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome (ex: Contato Inicial)"
          className="input-flat flex-1 min-w-[200px] text-card-foreground"
        />
        <input
          type="number"
          value={newDays}
          onChange={(e) => setNewDays(e.target.value)}
          placeholder="Dias"
          className="input-flat w-20 text-card-foreground"
        />
        <input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="input-flat flex-1 min-w-[150px] text-card-foreground"
        />
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === schedule.id ? (
              <>
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="input-flat flex-1 min-w-[150px] text-card-foreground"
                  />
                  <input
                    type="number"
                    value={editForm.days}
                    onChange={(e) => setEditForm({ ...editForm, days: e.target.value })}
                    className="input-flat w-20 text-card-foreground"
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="input-flat flex-1 min-w-[150px] text-card-foreground"
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
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium">{schedule.name}</span>
                  <span className="text-xs px-2 py-1 bg-muted rounded">{schedule.days_after_signature} dc</span>
                  {schedule.description && (
                    <span className="text-xs text-muted-foreground">{schedule.description}</span>
                  )}
                  <button
                    onClick={() => updateMutation.mutate({ id: schedule.id, is_active: !schedule.is_active })}
                    className={`text-xs px-2 py-1 border ${schedule.is_active ? 'border-success text-success' : 'border-muted-foreground text-muted-foreground'}`}
                  >
                    {schedule.is_active ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(schedule)} className="p-2 opacity-60 hover:opacity-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(schedule.id)}
                    className="p-2 opacity-60 hover:opacity-100 text-destructive"
                  >
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

// =============================================
// Tipos de Ação de CS
// =============================================

function TiposAcaoCSSection() {
  const { data: actionTypes = [], isLoading } = useCSActionTypes();
  const createMutation = useCreateCSActionType();
  const updateMutation = useUpdateCSActionType();
  const deleteMutation = useDeleteCSActionType();

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const handleAdd = () => {
    if (newName.trim()) {
      createMutation.mutate({
        name: newName.trim(),
        description: newDescription.trim() || null,
        is_active: true,
      });
      setNewName('');
      setNewDescription('');
    }
  };

  const handleEdit = (actionType: typeof actionTypes[0]) => {
    setEditForm({
      name: actionType.name,
      description: actionType.description || '',
    });
    setEditingId(actionType.id);
  };

  const handleSaveEdit = () => {
    if (editingId && editForm.name.trim()) {
      updateMutation.mutate({
        id: editingId,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      });
      setEditingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-black pb-2">
        <h3 className="text-xs uppercase tracking-widest font-semibold">Tipos de Ação de CS</h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Categorias de ações preventivas de Customer Success
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do tipo"
          className="input-flat flex-1 text-card-foreground"
        />
        <input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="input-flat flex-1 text-card-foreground"
        />
        <button onClick={handleAdd} className="btn-primary bg-card-foreground text-card">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {actionTypes.map((actionType) => (
          <div key={actionType.id} className="flex items-center justify-between p-3 border border-black">
            {editingId === actionType.id ? (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="input-flat flex-1 text-card-foreground"
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="input-flat flex-1 text-card-foreground"
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
                  <span className="text-sm">{actionType.name}</span>
                  {actionType.description && (
                    <span className="text-xs text-muted-foreground">{actionType.description}</span>
                  )}
                  <button
                    onClick={() => updateMutation.mutate({ id: actionType.id, is_active: !actionType.is_active })}
                    className={`text-xs px-2 py-1 border ${actionType.is_active ? 'border-success text-success' : 'border-muted-foreground text-muted-foreground'}`}
                  >
                    {actionType.is_active ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(actionType)} className="p-2 opacity-60 hover:opacity-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(actionType.id)}
                    className="p-2 opacity-60 hover:opacity-100 text-destructive"
                  >
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
