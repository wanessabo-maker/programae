import { useState } from 'react';
import { Plus, X, Briefcase } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { usePositions } from '@/hooks/usePositions';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TeamMemberPositionsTab() {
  const { teamMembers, areas } = useApp();
  const {
    positions,
    isLoading,
    getMemberPositions,
    assignPositionToMember,
    removePositionFromMember,
    getAreaName,
  } = usePositions();

  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');

  const handleAssignPosition = async () => {
    if (selectedMemberId && selectedPositionId) {
      await assignPositionToMember(selectedMemberId, selectedPositionId);
      setSelectedPositionId('');
    }
  };

  const handleRemovePosition = async (memberId: string, positionId: string) => {
    await removePositionFromMember(memberId, positionId);
  };

  // Get positions that aren't already assigned to the selected member
  const getAvailablePositions = (memberId: string) => {
    const memberPositions = getMemberPositions(memberId);
    const memberPositionIds = memberPositions.map(p => p.id);
    return positions.filter(p => p.is_active && !memberPositionIds.includes(p.id));
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Carregando...</div>;
  }

  const activeMembers = teamMembers.filter(m => m.active);

  return (
    <div className="space-y-6">
      {/* Quick assign section */}
      <div className="space-y-3 border border-black p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Atribuir Cargo</p>
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Membro</label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="input-flat">
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Cargo</label>
            <Select 
              value={selectedPositionId} 
              onValueChange={setSelectedPositionId}
              disabled={!selectedMemberId}
            >
              <SelectTrigger className="input-flat">
                <SelectValue placeholder="Selecione um cargo" />
              </SelectTrigger>
              <SelectContent>
                {selectedMemberId && getAvailablePositions(selectedMemberId).map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name} ({getAreaName(position.area_id)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <button
            onClick={handleAssignPosition}
            disabled={!selectedMemberId || !selectedPositionId}
            className="btn-primary bg-card-foreground text-card disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List all members with their positions */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-muted pb-2">
          Equipe e Cargos
        </h3>
        
        {activeMembers.map((member) => {
          const memberPositions = getMemberPositions(member.id);
          const memberArea = areas.find(a => a.id === member.areaId);
          
          return (
            <div key={member.id} className="border border-black p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium">{member.name}</span>
                    {memberArea && (
                      <span className="text-xs text-muted-foreground">
                        Área principal: {memberArea.name}
                      </span>
                    )}
                  </div>
                  
                  {/* Member positions */}
                  <div className="flex flex-wrap gap-2">
                    {memberPositions.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        Nenhum cargo atribuído
                      </span>
                    ) : (
                      memberPositions.map((position) => (
                        <Badge
                          key={position.id}
                          variant="outline"
                          className="flex items-center gap-1 pr-1"
                        >
                          <Briefcase className="w-3 h-3" />
                          <span>{position.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({getAreaName(position.area_id)})
                          </span>
                          <button
                            onClick={() => handleRemovePosition(member.id, position.id)}
                            className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inactive members section */}
      {teamMembers.filter(m => !m.active).length > 0 && (
        <div className="space-y-4 opacity-60">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-muted pb-2">
            Membros Inativos
          </h3>
          
          {teamMembers.filter(m => !m.active).map((member) => {
            const memberPositions = getMemberPositions(member.id);
            
            return (
              <div key={member.id} className="border border-muted p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-muted-foreground">{member.name}</span>
                  <Badge variant="secondary" className="text-xs">INATIVO</Badge>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {memberPositions.map((position) => (
                    <Badge key={position.id} variant="secondary" className="text-xs">
                      {position.name}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
