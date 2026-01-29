import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FunctionalArea = 'comercial' | 'projetos' | 'customer_success' | 'assistencia_tecnica';
export type PermissionType = 'view' | 'create' | 'edit' | 'delete';

export interface Area {
  id: string;
  name: string;
}

export interface Position {
  id: string;
  name: string;
  area: FunctionalArea;
  area_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PositionPermission {
  id: string;
  position_id: string;
  resource: string;
  permission: PermissionType;
}

export interface TeamMemberPosition {
  id: string;
  team_member_id: string;
  position_id: string;
  assigned_at: string;
}

// Resource labels for display
export const RESOURCE_LABELS: Record<string, string> = {
  clients: 'Clientes',
  projects: 'Projetos',
  actions: 'Ações',
  professionals: 'Profissionais',
  technical_assistance: 'Assistência Técnica',
  customer_success: 'Customer Success',
};

export const PERMISSION_LABELS: Record<PermissionType, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [permissions, setPermissions] = useState<PositionPermission[]>([]);
  const [memberPositionsList, setMemberPositionsList] = useState<TeamMemberPosition[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [positionsRes, permissionsRes, memberPositionsRes, areasRes] = await Promise.all([
        supabase.from('positions').select('*').order('name', { ascending: true }),
        supabase.from('position_permissions').select('*'),
        supabase.from('team_member_positions').select('*'),
        supabase.from('areas').select('*').order('name', { ascending: true }),
      ]);

      if (positionsRes.error) throw positionsRes.error;
      if (permissionsRes.error) throw permissionsRes.error;
      if (memberPositionsRes.error) throw memberPositionsRes.error;
      if (areasRes.error) throw areasRes.error;

      setPositions((positionsRes.data as Position[]) || []);
      setPermissions((permissionsRes.data as PositionPermission[]) || []);
      setMemberPositionsList((memberPositionsRes.data as TeamMemberPosition[]) || []);
      setAreas((areasRes.data as Area[]) || []);
    } catch (error) {
      console.error('Error fetching positions data:', error);
      toast.error('Erro ao carregar dados de cargos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to derive functional area enum from area name
  const deriveAreaEnum = (areaId: string): FunctionalArea => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return 'comercial';
    
    const name = area.name.toLowerCase();
    if (name.includes('projeto')) return 'projetos';
    if (name.includes('customer') || name.includes('success') || name === 'cs') return 'customer_success';
    if (name.includes('assist') || name.includes('técnica') || name.includes('logist') || name === 'at') return 'assistencia_tecnica';
    return 'comercial';
  };

  // CRUD for Positions
  const createPosition = async (data: { name: string; area_id: string; description?: string }) => {
    try {
      // Derive the correct functional area enum from area_id
      const areaEnum = deriveAreaEnum(data.area_id);
      
      const { data: newPosition, error } = await supabase
        .from('positions')
        .insert({
          name: data.name,
          area_id: data.area_id,
          area: areaEnum,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      setPositions(prev => [...prev, newPosition as Position]);
      toast.success('Cargo criado com sucesso');
      return newPosition;
    } catch (error) {
      console.error('Error creating position:', error);
      toast.error('Erro ao criar cargo');
      return null;
    }
  };

  const updatePosition = async (id: string, data: { name?: string; description?: string; is_active?: boolean }) => {
    try {
      const { error } = await supabase
        .from('positions')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      setPositions(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      toast.success('Cargo atualizado');
      return true;
    } catch (error) {
      console.error('Error updating position:', error);
      toast.error('Erro ao atualizar cargo');
      return false;
    }
  };

  const deletePosition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPositions(prev => prev.filter(p => p.id !== id));
      toast.success('Cargo removido');
      return true;
    } catch (error) {
      console.error('Error deleting position:', error);
      toast.error('Erro ao remover cargo');
      return false;
    }
  };

  // CRUD for Position Permissions
  const setPositionPermissions = async (positionId: string, newPermissions: { resource: string; permission: PermissionType }[]) => {
    try {
      // Delete existing permissions for this position
      await supabase
        .from('position_permissions')
        .delete()
        .eq('position_id', positionId);

      // Insert new permissions
      if (newPermissions.length > 0) {
        const { error } = await supabase
          .from('position_permissions')
          .insert(newPermissions.map(p => ({ position_id: positionId, ...p })));

        if (error) throw error;
      }

      await fetchData();
      toast.success('Permissões atualizadas');
      return true;
    } catch (error) {
      console.error('Error setting position permissions:', error);
      toast.error('Erro ao atualizar permissões');
      return false;
    }
  };

  // CRUD for Team Member Positions
  const assignPositionToMember = async (teamMemberId: string, positionId: string) => {
    try {
      const { error } = await supabase
        .from('team_member_positions')
        .insert({ team_member_id: teamMemberId, position_id: positionId });

      if (error) throw error;
      await fetchData();
      toast.success('Cargo atribuído');
      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Este membro já possui este cargo');
      } else {
        console.error('Error assigning position:', error);
        toast.error('Erro ao atribuir cargo');
      }
      return false;
    }
  };

  const removePositionFromMember = async (teamMemberId: string, positionId: string) => {
    try {
      const { error } = await supabase
        .from('team_member_positions')
        .delete()
        .eq('team_member_id', teamMemberId)
        .eq('position_id', positionId);

      if (error) throw error;
      setMemberPositionsList(prev => prev.filter(mp => !(mp.team_member_id === teamMemberId && mp.position_id === positionId)));
      toast.success('Cargo removido do membro');
      return true;
    } catch (error) {
      console.error('Error removing position from member:', error);
      toast.error('Erro ao remover cargo do membro');
      return false;
    }
  };

  const updateMemberPositions = async (teamMemberId: string, positionIds: string[]) => {
    try {
      // Delete all current positions
      await supabase
        .from('team_member_positions')
        .delete()
        .eq('team_member_id', teamMemberId);

      // Insert new positions
      if (positionIds.length > 0) {
        const { error } = await supabase
          .from('team_member_positions')
          .insert(positionIds.map(pid => ({ team_member_id: teamMemberId, position_id: pid })));

        if (error) throw error;
      }

      await fetchData();
      toast.success('Cargos do membro atualizados');
      return true;
    } catch (error) {
      console.error('Error setting member positions:', error);
      toast.error('Erro ao atualizar cargos do membro');
      return false;
    }
  };

  // Helper functions
  const getPositionsByAreaId = (areaId: string) => {
    return positions.filter(p => p.area_id === areaId && p.is_active);
  };

  const getPositionPermissions = (positionId: string) => {
    return permissions.filter(p => p.position_id === positionId);
  };

  const getMemberPositionsList = (teamMemberId: string) => {
    return memberPositionsList
      .filter(mp => mp.team_member_id === teamMemberId)
      .map(mp => positions.find(p => p.id === mp.position_id))
      .filter(Boolean) as Position[];
  };

  const getMemberAreaIds = (teamMemberId: string): string[] => {
    const memberPos = getMemberPositionsList(teamMemberId);
    return [...new Set(memberPos.map(p => p.area_id).filter(Boolean))] as string[];
  };

  const getAreaName = (areaId: string | null): string => {
    if (!areaId) return 'Sem área';
    const area = areas.find(a => a.id === areaId);
    return area?.name || 'Área desconhecida';
  };

  return {
    positions,
    permissions,
    memberPositions: memberPositionsList,
    areas,
    isLoading,
    refetch: fetchData,
    // Position CRUD
    createPosition,
    updatePosition,
    deletePosition,
    // Permission CRUD
    setPositionPermissions,
    // Member-Position CRUD
    assignPositionToMember,
    removePositionFromMember,
    updateMemberPositions,
    // Helpers
    getPositionsByAreaId,
    getPositionPermissions,
    getMemberPositions: getMemberPositionsList,
    getMemberAreaIds,
    getAreaName,
  };
}
