import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Position, Area } from '@/hooks/usePositions';

interface EditMemberPositionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: { id: string; name: string } | null;
  memberPositions: Position[];
  allPositions: Position[];
  areas: Area[];
  onSave: (memberId: string, positionIds: string[]) => Promise<boolean>;
  getAreaName: (areaId: string | null) => string;
}

export function EditMemberPositionsModal({
  isOpen,
  onClose,
  member,
  memberPositions,
  allPositions,
  areas,
  onSave,
  getAreaName,
}: EditMemberPositionsModalProps) {
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (member && memberPositions) {
      setSelectedPositionIds(memberPositions.map(p => p.id));
    }
  }, [member, memberPositions]);

  if (!isOpen || !member) return null;

  const handleTogglePosition = (positionId: string) => {
    setSelectedPositionIds(prev =>
      prev.includes(positionId)
        ? prev.filter(id => id !== positionId)
        : [...prev, positionId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(member.id, selectedPositionIds);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  // Group positions by area
  const positionsByArea = areas.reduce((acc, area) => {
    const areaPositions = allPositions.filter(p => p.area_id === area.id && p.is_active);
    if (areaPositions.length > 0) {
      acc[area.id] = { area, positions: areaPositions };
    }
    return acc;
  }, {} as Record<string, { area: Area; positions: Position[] }>);

  // Positions without area
  const unassignedPositions = allPositions.filter(p => !p.area_id && p.is_active);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-black w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-muted">
          <div>
            <h2 className="text-lg font-semibold">Editar Cargos</h2>
            <p className="text-sm text-muted-foreground">{member.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current positions summary */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Cargos Selecionados ({selectedPositionIds.length})
            </p>
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {selectedPositionIds.length === 0 ? (
                <span className="text-sm text-muted-foreground italic">
                  Nenhum cargo selecionado
                </span>
              ) : (
                selectedPositionIds.map(id => {
                  const position = allPositions.find(p => p.id === id);
                  if (!position) return null;
                  return (
                    <Badge key={id} variant="default" className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {position.name}
                      <button
                        onClick={() => handleTogglePosition(id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-muted pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Todos os Cargos Disponíveis
            </p>

            {/* Positions grouped by area */}
            {Object.values(positionsByArea).map(({ area, positions }) => (
              <div key={area.id} className="mb-4">
                <p className="text-sm font-medium mb-2 text-muted-foreground">{area.name}</p>
                <div className="space-y-2 pl-2">
                  {positions.map(position => (
                    <label
                      key={position.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedPositionIds.includes(position.id)}
                        onCheckedChange={() => handleTogglePosition(position.id)}
                      />
                      <div className="flex-1">
                        <span className="text-sm">{position.name}</span>
                        {position.description && (
                          <p className="text-xs text-muted-foreground">{position.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Unassigned positions */}
            {unassignedPositions.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2 text-muted-foreground">Sem área definida</p>
                <div className="space-y-2 pl-2">
                  {unassignedPositions.map(position => (
                    <label
                      key={position.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedPositionIds.includes(position.id)}
                        onCheckedChange={() => handleTogglePosition(position.id)}
                      />
                      <span className="text-sm">{position.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {allPositions.filter(p => p.is_active).length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                Nenhum cargo cadastrado. Crie cargos na aba "Cargos" primeiro.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-muted">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary bg-card-foreground text-card disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
