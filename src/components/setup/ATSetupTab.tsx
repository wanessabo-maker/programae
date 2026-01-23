import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react';
import {
  useATActionTypes,
  useCreateATActionType,
  useUpdateATActionType,
  useDeleteATActionType,
} from '@/hooks/useTechnicalAssistance';

export function ATSetupTab() {
  return (
    <div className="space-y-8">
      <TiposAcaoATSection />
      <RegrasATSection />
    </div>
  );
}

// =============================================
// Tipos de Ação de AT
// =============================================

function TiposAcaoATSection() {
  const { data: actionTypes = [], isLoading } = useATActionTypes();
  const createMutation = useCreateATActionType();
  const updateMutation = useUpdateATActionType();
  const deleteMutation = useDeleteATActionType();

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
        <h3 className="text-xs uppercase tracking-widest font-semibold">Tipos de Ação Reativa (AT)</h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Categorias de serviços de assistência técnica
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

// =============================================
// Regras de AT (Informativo)
// =============================================

function RegrasATSection() {
  return (
    <div className="space-y-4">
      <div className="border-b border-black pb-2">
        <h3 className="text-xs uppercase tracking-widest font-semibold">Regras de Assistência Técnica</h3>
      </div>

      <div className="space-y-3 text-xs">
        <div className="p-4 border border-black bg-muted/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-warning" />
            <div>
              <p className="font-medium">Datas Obrigatórias</p>
              <p className="text-muted-foreground mt-1">
                Toda ação de AT deve conter:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                <li><strong>Data de Registro do Contato</strong> - Quando o cliente reportou o problema</li>
                <li><strong>Data da Visita Técnica</strong> - Quando a visita foi realizada</li>
                <li><strong>Data da Solução Definitiva</strong> - Quando o problema foi resolvido</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 border border-black bg-muted/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-destructive" />
            <div>
              <p className="font-medium">Regra de Fechamento</p>
              <p className="text-muted-foreground mt-1">
                A ação de AT <strong>não pode ser finalizada</strong> sem o preenchimento da 
                <strong> Data da Solução Definitiva</strong>. Enquanto não houver solução definitiva, 
                a AT permanece aberta e não é permitida baixa ou encerramento.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-black bg-muted/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-medium">Vínculos Obrigatórios</p>
              <p className="text-muted-foreground mt-1">
                Toda ação de AT deve estar vinculada a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                <li><strong>Cliente</strong> - Obrigatório</li>
                <li><strong>Projeto</strong> - Quando existir</li>
                <li><strong>Contrato</strong> - Quando existir</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
