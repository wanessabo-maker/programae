import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { usePositions, PermissionType, RESOURCE_LABELS, PERMISSION_LABELS } from '@/hooks/usePositions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';

const RESOURCES = ['clients', 'projects', 'actions', 'professionals', 'technical_assistance', 'customer_success'];
const PERMISSIONS: PermissionType[] = ['view', 'create', 'edit', 'delete'];

export function AreasAndPositionsTab() {
  const { areas, addArea, updateArea, deleteArea } = useApp();
  const {
    positions,
    permissions,
    isLoading,
    createPosition,
    updatePosition,
    deletePosition,
    setPositionPermissions,
    getPositionPermissions,
  } = usePositions();

  // Area editing state
  const [newAreaName, setNewAreaName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editAreaName, setEditAreaName] = useState('');

  // Position adding state (per area)
  const [addingPositionAreaId, setAddingPositionAreaId] = useState<string | null>(null);
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionDescription, setNewPositionDescription] = useState('');

  // Position editing state
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editPositionForm, setEditPositionForm] = useState({ name: '', description: '' });

  // Permissions expand state
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null);

  // Expanded areas
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const handleAddArea = () => {
    if (newAreaName.trim()) {
      addArea({ name: newAreaName.trim() });
      setNewAreaName('');
    }
  };

  const handleAddPosition = async (areaId: string) => {
    if (newPositionName.trim()) {
      await createPosition({
        name: newPositionName.trim(),
        area_id: areaId,
        description: newPositionDescription.trim() || undefined,
      });
      setNewPositionName('');
      setNewPositionDescription('');
      setAddingPositionAreaId(null);
    }
  };

  const handleSavePositionEdit = async (id: string) => {
    if (editPositionForm.name.trim()) {
      await updatePosition(id, {
        name: editPositionForm.name.trim(),
        description: editPositionForm.description.trim() || undefined,
      });
      setEditingPositionId(null);
    }
  };

  const handlePermissionChange = async (positionId: string, resource: string, permission: PermissionType, checked: boolean) => {
    const currentPerms = getPositionPermissions(positionId);
    let newPerms: { resource: string; permission: PermissionType }[];
    if (checked) {
      newPerms = [
        ...currentPerms.map(p => ({ resource: p.resource, permission: p.permission })),
        { resource, permission },
      ];
    } else {
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

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add new area */}
      <div className="space-y-3 border border-black p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Nova Área</p>
        <div className="flex gap-2">
          <input
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="Nome da área"
            className="input-flat flex-1 text-card-foreground"
          />
          <button onClick={handleAddArea} className="btn-primary bg-card-foreground text-card">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Areas list with nested positions */}
      {areas.map((area) => {
        const areaPositions = positions.filter(p => p.area_id === area.id);
        const isExpanded = expandedAreas.has(area.id);

        return (
          <Collapsible
            key={area.id}
            open={isExpanded}
            onOpenChange={() => toggleArea(area.id)}
          >
            <div className="border border-black">
              {/* Area header */}
              <div className="flex items-center justify-between p-3 bg-muted/30">
                {editingAreaId === area.id ? (
                  <>
                    <input
                      value={editAreaName}
                      onChange={(e) => setEditAreaName(e.target.value)}
                      className="input-flat flex-1 mr-2 text-card-foreground"
                    />
                    <div className="flex gap-1">
                      <button onClick={() => { updateArea(area.id, { name: editAreaName }); setEditingAreaId(null); }} className="p-2">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingAreaId(null)} className="p-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-3 flex-1">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="text-sm font-semibold uppercase tracking-widest">{area.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({areaPositions.length} cargo{areaPositions.length !== 1 ? 's' : ''})
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingAreaId(area.id); setEditAreaName(area.name); }}
                        className="p-2 opacity-60 hover:opacity-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteArea(area.id); }}
                        className="p-2 opacity-60 hover:opacity-100 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Positions inside this area */}
              <CollapsibleContent>
                <div className="border-t border-black p-4 space-y-3">
                  {/* Add position button/form */}
                  {addingPositionAreaId === area.id ? (
                    <div className="flex gap-2 flex-wrap items-end">
                      <input
                        value={newPositionName}
                        onChange={(e) => setNewPositionName(e.target.value)}
                        placeholder="Nome do cargo"
                        className="input-flat flex-1 text-card-foreground min-w-[180px]"
                      />
                      <input
                        value={newPositionDescription}
                        onChange={(e) => setNewPositionDescription(e.target.value)}
                        placeholder="Descrição (opcional)"
                        className="input-flat flex-1 text-card-foreground min-w-[140px]"
                      />
                      <button onClick={() => handleAddPosition(area.id)} className="p-2">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setAddingPositionAreaId(null); setNewPositionName(''); setNewPositionDescription(''); }} className="p-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingPositionAreaId(area.id)}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-3 h-3" /> Adicionar cargo
                    </button>
                  )}

                  {/* Positions list */}
                  {areaPositions.length === 0 && addingPositionAreaId !== area.id && (
                    <p className="text-xs text-muted-foreground italic">Nenhum cargo cadastrado</p>
                  )}

                  {areaPositions.map((position) => (
                    <Collapsible
                      key={position.id}
                      open={expandedPositionId === position.id}
                      onOpenChange={(open) => setExpandedPositionId(open ? position.id : null)}
                    >
                      <div className="border border-muted">
                        <div className="flex items-center justify-between p-3">
                          {editingPositionId === position.id ? (
                            <>
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  value={editPositionForm.name}
                                  onChange={(e) => setEditPositionForm({ ...editPositionForm, name: e.target.value })}
                                  className="input-flat flex-1 text-card-foreground"
                                />
                                <input
                                  value={editPositionForm.description}
                                  onChange={(e) => setEditPositionForm({ ...editPositionForm, description: e.target.value })}
                                  placeholder="Descrição"
                                  className="input-flat flex-1 text-card-foreground"
                                />
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => handleSavePositionEdit(position.id)} className="p-2"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingPositionId(null)} className="p-2"><X className="w-4 h-4" /></button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-4 flex-1">
                                <CollapsibleTrigger asChild>
                                  <button className="p-1 hover:bg-muted rounded">
                                    {expandedPositionId === position.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                </CollapsibleTrigger>
                                <span className="text-sm font-medium">{position.name}</span>
                                {position.description && <span className="text-xs text-muted-foreground">{position.description}</span>}
                                <button
                                  onClick={() => updatePosition(position.id, { is_active: !position.is_active })}
                                  className={`text-xs px-2 py-1 border ${position.is_active ? 'border-success text-success' : 'border-muted-foreground text-muted-foreground'}`}
                                >
                                  {position.is_active ? 'ATIVO' : 'INATIVO'}
                                </button>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setEditingPositionId(position.id); setEditPositionForm({ name: position.name, description: position.description || '' }); }}
                                  className="p-2 opacity-60 hover:opacity-100"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => deletePosition(position.id)} className="p-2 opacity-60 hover:opacity-100 text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Permissions panel */}
                        <CollapsibleContent>
                          <div className="border-t border-muted p-4 bg-muted/20">
                            <div className="flex items-center gap-2 mb-4">
                              <Shield className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs uppercase tracking-widest text-muted-foreground">Permissões do Cargo</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-black">
                                    <th className="text-left py-2 px-3 font-medium">Recurso</th>
                                    {PERMISSIONS.map((perm) => (
                                      <th key={perm} className="text-center py-2 px-3 font-medium">{PERMISSION_LABELS[perm]}</th>
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
                                            onCheckedChange={(checked) => handlePermissionChange(position.id, resource, perm, checked as boolean)}
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
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
