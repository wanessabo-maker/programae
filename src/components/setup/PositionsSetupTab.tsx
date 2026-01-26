import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { usePositions, PermissionType, RESOURCE_LABELS, PERMISSION_LABELS } from '@/hooks/usePositions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';

const RESOURCES = ['clients', 'projects', 'actions', 'professionals', 'technical_assistance', 'customer_success'];
const PERMISSIONS: PermissionType[] = ['view', 'create', 'edit', 'delete'];

export function PositionsSetupTab() {
  const {
    positions,
    permissions,
    areas,
    isLoading,
    createPosition,
    updatePosition,
    deletePosition,
    setPositionPermissions,
    getPositionPermissions,
  } = usePositions();

  const [newName, setNewName] = useState('');
  const [newAreaId, setNewAreaId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (newName.trim() && newAreaId) {
      await createPosition({
        name: newName.trim(),
        area_id: newAreaId,
        description: newDescription.trim() || undefined,
      });
      setNewName('');
      setNewDescription('');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (editForm.name.trim()) {
      await updatePosition(id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      });
      setEditingId(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await updatePosition(id, { is_active: !currentActive });
  };

  const handlePermissionChange = async (positionId: string, resource: string, permission: PermissionType, checked: boolean) => {
    const currentPerms = getPositionPermissions(positionId);
    let newPerms: { resource: string; permission: PermissionType }[];

    if (checked) {
      // Add permission
      newPerms = [
        ...currentPerms.map(p => ({ resource: p.resource, permission: p.permission })),
        { resource, permission },
      ];
    } else {
      // Remove permission
      newPerms = currentPerms
        .filter(p => !(p.resource === resource && p.permission === permission))
        .map(p => ({ resource: p.resource, permission: p.permission }));
    }

    await setPositionPermissions(positionId, newPerms);
  };

  const hasPermission = (positionId: string, resource: string, permission: PermissionType) => {
    return permissions.some(
      p => p.position_id === positionId && p.resource === resource && p.permission === permission
    );
  };

  // Group positions by area
  const positionsByArea = areas.reduce((acc, area) => {
    acc[area.id] = positions.filter(p => p.area_id === area.id);
    return acc;
  }, {} as Record<string, typeof positions>);

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add new position */}
      <div className="space-y-3 border border-black p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Novo Cargo</p>
        <div className="flex gap-2 flex-wrap">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do cargo"
            className="input-flat flex-1 text-card-foreground min-w-[200px]"
          />
          <select
            value={newAreaId}
            onChange={(e) => setNewAreaId(e.target.value)}
            className="input-flat text-card-foreground"
          >
            <option value="">Selecione a Área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="input-flat flex-1 text-card-foreground min-w-[150px]"
          />
          <button onClick={handleAdd} disabled={!newAreaId} className="btn-primary bg-card-foreground text-card disabled:opacity-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List positions by area */}
      {areas.map((area) => (
        <div key={area.id} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-muted pb-2">
            {area.name}
          </h3>
          
          {(!positionsByArea[area.id] || positionsByArea[area.id].length === 0) ? (
            <p className="text-xs text-muted-foreground italic py-2">Nenhum cargo cadastrado</p>
          ) : (
            <div className="space-y-2">
              {positionsByArea[area.id].map((position) => (
                <Collapsible
                  key={position.id}
                  open={expandedPositionId === position.id}
                  onOpenChange={(open) => setExpandedPositionId(open ? position.id : null)}
                >
                  <div className="border border-black">
                    <div className="flex items-center justify-between p-3">
                      {editingId === position.id ? (
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
                              placeholder="Descrição"
                              className="input-flat flex-1 text-card-foreground"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveEdit(position.id)} className="p-2">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-2">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 flex-1">
                            <CollapsibleTrigger asChild>
                              <button className="p-1 hover:bg-muted rounded">
                                {expandedPositionId === position.id ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <span className="text-sm font-medium">{position.name}</span>
                            {position.description && (
                              <span className="text-xs text-muted-foreground">{position.description}</span>
                            )}
                            <button
                              onClick={() => handleToggleActive(position.id, position.is_active)}
                              className={`text-xs px-2 py-1 border ${
                                position.is_active
                                  ? 'border-success text-success'
                                  : 'border-muted-foreground text-muted-foreground'
                              }`}
                            >
                              {position.is_active ? 'ATIVO' : 'INATIVO'}
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingId(position.id);
                                setEditForm({ name: position.name, description: position.description || '' });
                              }}
                              className="p-2 opacity-60 hover:opacity-100"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePosition(position.id)}
                              className="p-2 opacity-60 hover:opacity-100 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Permissions panel */}
                    <CollapsibleContent>
                      <div className="border-t border-black p-4 bg-muted/20">
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs uppercase tracking-widest text-muted-foreground">
                            Permissões do Cargo
                          </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-black">
                                <th className="text-left py-2 px-3 font-medium">Recurso</th>
                                {PERMISSIONS.map((perm) => (
                                  <th key={perm} className="text-center py-2 px-3 font-medium">
                                    {PERMISSION_LABELS[perm]}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {RESOURCES.map((resource) => (
                                <tr key={resource} className="border-b border-muted hover:bg-muted/30">
                                  <td className="py-2 px-3">{RESOURCE_LABELS[resource] || resource}</td>
                                  {PERMISSIONS.map((perm) => (
                                    <td key={perm} className="text-center py-2 px-3">
                                      <Checkbox
                                        checked={hasPermission(position.id, resource, perm)}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(position.id, resource, perm, checked as boolean)
                                        }
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
