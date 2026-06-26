/**
 * SetupContext — dados de configuração do sistema
 * (áreas, tipos, categorias, recompensas, membros, metas)
 *
 * FASE 2: AppContext dividido em 3 contextos por domínio.
 * Antes: qualquer mudança em qualquer dado re-renderizava o app inteiro.
 * Agora: cada contexto re-renderiza apenas os componentes que o consomem.
 *
 * Como usar:
 *   import { useSetup } from '@/contexts/SetupContext';
 *   const { areas, teamMembers, addArea } = useSetup();
 */

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import {
  useAreas, useCreateArea, useUpdateArea, useDeleteArea,
  useTeamMembers, useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember,
  useActionTypes, useCreateActionType, useUpdateActionType, useDeleteActionType,
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal,
  useProfessionalTypes, useCreateProfessionalType, useUpdateProfessionalType, useDeleteProfessionalType,
  useProfessionalCategories, useCreateProfessionalCategory, useUpdateProfessionalCategory, useDeleteProfessionalCategory,
  useRewards, useCreateReward, useUpdateReward, useDeleteReward,
  useSystemSettings, useUpsertSystemSetting,
} from '@/hooks/useDatabase';
import {
  Area, TeamMember, ActionType, Meta, ProfessionalType,
  ProfessionalCategory, Reward, CreditValiditySettings,
} from '@/types';

// ── Transform helpers ────────────────────────────────────────────────────────

function transformArea(d: { id: string; name: string }): Area {
  return { id: d.id, name: d.name };
}

function transformTeamMember(d: { id: string; name: string; area_id: string | null; active: boolean | null; user_id?: string | null }): TeamMember {
  return { id: d.id, name: d.name, areaId: d.area_id || '', active: d.active ?? true, userId: d.user_id ?? undefined };
}

function transformActionType(d: {
  id: string; name: string; classification: string; impacts: string[] | null;
  requires_value: string | null; additional_fields: boolean | null; enabled_fields: string[] | null;
  points: number | null; credit_validity_type: string | null; credit_validity_days: number | null; area_id: string | null;
}): ActionType {
  return {
    id: d.id, name: d.name,
    classification: d.classification as ActionType['classification'],
    impactsMetas: (d.impacts || []) as ActionType['impactsMetas'],
    requiresValue: (d.requires_value as ActionType['requiresValue']) ?? 'nenhum',
    additionalFields: d.additional_fields ?? false,
    enabledFields: (d.enabled_fields || []) as ActionType['enabledFields'],
    programPoints: d.points ?? 0,
    bonusPointsWithProfessional: (d as any).bonus_points_with_professional ?? 0,
    creditValidityType: (d.credit_validity_type as ActionType['creditValidityType']) ?? 'global',
    creditValidityDays: d.credit_validity_days ?? undefined,
    areaId: d.area_id ?? undefined,
  };
}

function transformGoal(d: {
  id: string; area_id: string | null; team_member_id?: string | null; metric: string; value: number;
  category_id?: string | null; validity_type?: string | null; start_date?: string | null;
  end_date?: string | null; is_active?: boolean | null; sales_channel?: string | null;
}): Meta {
  return {
    id: d.id, areaId: d.area_id || '', teamMemberId: d.team_member_id || undefined,
    type: d.metric as Meta['type'], value: Number(d.value), categoryId: d.category_id || undefined,
    validityType: (d.validity_type as Meta['validityType']) || 'mensal',
    startDate: d.start_date || undefined, endDate: d.end_date || undefined, isActive: d.is_active ?? true,
    salesChannel: (d.sales_channel as 'convencional' | 'engenharia' | null | undefined) ?? undefined,
  };
}

function transformProfessionalType(d: { id: string; name: string }): ProfessionalType {
  return { id: d.id, name: d.name };
}

function transformProfessionalCategory(d: { id: string; name: string; condition: string; days: number; hierarchy: number; points: number | null; min_percentage: number | null; max_percentage: number | null }): ProfessionalCategory {
  return {
    id: d.id, name: d.name, order: d.hierarchy,
    condition: d.condition as ProfessionalCategory['condition'], daysToChange: d.days,
    minPercentage: d.min_percentage ?? undefined,
    maxPercentage: d.max_percentage ?? undefined,
  };
}

function transformReward(d: { id: string; name: string; cost: number }): Reward {
  return { id: d.id, name: d.name, cost: d.cost };
}

// ── Context type ─────────────────────────────────────────────────────────────

interface SetupContextType {
  areas: Area[];
  teamMembers: TeamMember[];
  actionTypes: ActionType[];
  metas: Meta[];
  professionalTypes: ProfessionalType[];
  professionalCategories: ProfessionalCategory[];
  rewards: Reward[];
  creditValiditySettings: CreditValiditySettings;
  isLoading: boolean;

  addArea: (area: Omit<Area, 'id'>) => void;
  updateArea: (id: string, area: Partial<Area>) => void;
  deleteArea: (id: string) => void;

  addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
  updateTeamMember: (id: string, member: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;

  addActionType: (type: Omit<ActionType, 'id'>) => void;
  updateActionType: (id: string, type: Partial<ActionType>) => void;
  deleteActionType: (id: string) => void;

  addMeta: (meta: Omit<Meta, 'id'>) => void;
  updateMeta: (id: string, meta: Partial<Meta>) => void;
  deleteMeta: (id: string) => void;

  addProfessionalType: (type: Omit<ProfessionalType, 'id'>) => void;
  updateProfessionalType: (id: string, type: Partial<ProfessionalType>) => void;
  deleteProfessionalType: (id: string) => void;

  addProfessionalCategory: (category: Omit<ProfessionalCategory, 'id'>) => void;
  updateProfessionalCategory: (id: string, category: Partial<ProfessionalCategory>) => void;
  deleteProfessionalCategory: (id: string) => void;

  addReward: (reward: Omit<Reward, 'id'>) => void;
  updateReward: (id: string, reward: Partial<Reward>) => void;
  deleteReward: (id: string) => void;

  updateCreditValiditySettings: (settings: CreditValiditySettings) => void;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export function SetupProvider({ children }: { children: ReactNode }) {
  const { data: areasData, isLoading: areasLoading } = useAreas();
  const { data: teamMembersData, isLoading: teamMembersLoading } = useTeamMembers();
  const { data: actionTypesData, isLoading: actionTypesLoading } = useActionTypes();
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: professionalTypesData, isLoading: professionalTypesLoading } = useProfessionalTypes();
  const { data: professionalCategoriesData, isLoading: professionalCategoriesLoading } = useProfessionalCategories();
  const { data: rewardsData, isLoading: rewardsLoading } = useRewards();
  const { data: systemSettingsData } = useSystemSettings();

  const createArea = useCreateArea(); const updateAreaMut = useUpdateArea(); const deleteAreaMut = useDeleteArea();
  const createTeamMember = useCreateTeamMember(); const updateTeamMemberMut = useUpdateTeamMember(); const deleteTeamMemberMut = useDeleteTeamMember();
  const createActionType = useCreateActionType(); const updateActionTypeMut = useUpdateActionType(); const deleteActionTypeMut = useDeleteActionType();
  const createGoal = useCreateGoal(); const updateGoalMut = useUpdateGoal(); const deleteGoalMut = useDeleteGoal();
  const createProfessionalType = useCreateProfessionalType(); const updateProfessionalTypeMut = useUpdateProfessionalType(); const deleteProfessionalTypeMut = useDeleteProfessionalType();
  const createProfessionalCategory = useCreateProfessionalCategory(); const updateProfessionalCategoryMut = useUpdateProfessionalCategory(); const deleteProfessionalCategoryMut = useDeleteProfessionalCategory();
  const createReward = useCreateReward(); const updateRewardMut = useUpdateReward(); const deleteRewardMut = useDeleteReward();
  const upsertSystemSetting = useUpsertSystemSetting();

  const areas = useMemo(() => areasData?.map(transformArea) || [], [areasData]);
  const teamMembers = useMemo(() => teamMembersData?.map(transformTeamMember) || [], [teamMembersData]);
  const actionTypes = useMemo(() => actionTypesData?.map(transformActionType) || [], [actionTypesData]);
  const metas = useMemo(() => goalsData?.map(transformGoal) || [], [goalsData]);
  const professionalTypes = useMemo(() => professionalTypesData?.map(transformProfessionalType) || [], [professionalTypesData]);
  const professionalCategories = useMemo(() => professionalCategoriesData?.map(transformProfessionalCategory) || [], [professionalCategoriesData]);
  const rewards = useMemo(() => rewardsData?.map(transformReward) || [], [rewardsData]);

  const isLoading = areasLoading || teamMembersLoading || actionTypesLoading || goalsLoading ||
    professionalTypesLoading || professionalCategoriesLoading || rewardsLoading;

  const creditValiditySettings = useMemo((): CreditValiditySettings => {
    const s = systemSettingsData?.find(s => s.key === 'credit_validity');
    if (s?.value && typeof s.value === 'object' && 'type' in s.value) return s.value as unknown as CreditValiditySettings;
    return { type: 'mensal' };
  }, [systemSettingsData]);

  const addArea = useCallback((a: Omit<Area, 'id'>) => createArea.mutate(a.name), [createArea]);
  const updateArea = useCallback((id: string, a: Partial<Area>) => { if (a.name) updateAreaMut.mutate({ id, name: a.name }); }, [updateAreaMut]);
  const deleteArea = useCallback((id: string) => deleteAreaMut.mutate(id), [deleteAreaMut]);

  const addTeamMember = useCallback((m: Omit<TeamMember, 'id'>) => createTeamMember.mutate({ name: m.name, area_id: m.areaId || null, active: m.active }), [createTeamMember]);
  const updateTeamMember = useCallback((id: string, m: Partial<TeamMember>) => updateTeamMemberMut.mutate({ id, name: m.name, area_id: m.areaId ?? undefined, active: m.active }), [updateTeamMemberMut]);
  const deleteTeamMember = useCallback((id: string) => deleteTeamMemberMut.mutate(id), [deleteTeamMemberMut]);

  const addActionType = useCallback((t: Omit<ActionType, 'id'>) => createActionType.mutate({
    name: t.name, classification: t.classification, impacts: t.impactsMetas, requires_value: t.requiresValue,
    additional_fields: t.additionalFields, enabled_fields: t.enabledFields || [], points: t.programPoints,
    bonus_points_with_professional: t.bonusPointsWithProfessional ?? 0, credit_validity_type: t.creditValidityType,
    credit_validity_days: t.creditValidityDays ?? null, area_id: t.areaId ?? null,
  }), [createActionType]);
  const updateActionType = useCallback((id: string, t: Partial<ActionType>) => updateActionTypeMut.mutate({
    id, name: t.name, classification: t.classification, impacts: t.impactsMetas, requires_value: t.requiresValue,
    additional_fields: t.additionalFields, enabled_fields: t.enabledFields, points: t.programPoints,
    bonus_points_with_professional: t.bonusPointsWithProfessional ?? 0, credit_validity_type: t.creditValidityType,
    credit_validity_days: t.creditValidityDays ?? null, area_id: t.areaId ?? null,
  }), [updateActionTypeMut]);
  const deleteActionType = useCallback((id: string) => deleteActionTypeMut.mutate(id), [deleteActionTypeMut]);

  const addMeta = useCallback((m: Omit<Meta, 'id'>) => createGoal.mutate({
    area_id: m.areaId, team_member_id: m.teamMemberId, metric: m.type, value: m.value,
    category_id: m.categoryId, validity_type: m.validityType, start_date: m.startDate, end_date: m.endDate, is_active: m.isActive,
    sales_channel: m.salesChannel ?? null,
  }), [createGoal]);
  const updateMeta = useCallback((id: string, m: Partial<Meta>) => updateGoalMut.mutate({
    id, area_id: m.areaId, team_member_id: m.teamMemberId, metric: m.type, value: m.value,
    category_id: m.categoryId, validity_type: m.validityType, start_date: m.startDate, end_date: m.endDate, is_active: m.isActive,
    sales_channel: m.salesChannel ?? null,
  }), [updateGoalMut]);
  const deleteMeta = useCallback((id: string) => deleteGoalMut.mutate(id), [deleteGoalMut]);

  const addProfessionalType = useCallback((t: Omit<ProfessionalType, 'id'>) => createProfessionalType.mutate(t.name), [createProfessionalType]);
  const updateProfessionalType = useCallback((id: string, t: Partial<ProfessionalType>) => { if (t.name) updateProfessionalTypeMut.mutate({ id, name: t.name }); }, [updateProfessionalTypeMut]);
  const deleteProfessionalType = useCallback((id: string) => deleteProfessionalTypeMut.mutate(id), [deleteProfessionalTypeMut]);

  const addProfessionalCategory = useCallback((c: Omit<ProfessionalCategory, 'id'>) => createProfessionalCategory.mutate({ name: c.name, condition: c.condition, days: c.daysToChange, hierarchy: c.order }), [createProfessionalCategory]);
  const updateProfessionalCategory = useCallback((id: string, c: Partial<ProfessionalCategory>) => updateProfessionalCategoryMut.mutate({ id, name: c.name, condition: c.condition, days: c.daysToChange, hierarchy: c.order }), [updateProfessionalCategoryMut]);
  const deleteProfessionalCategory = useCallback((id: string) => deleteProfessionalCategoryMut.mutate(id), [deleteProfessionalCategoryMut]);

  const addReward = useCallback((r: Omit<Reward, 'id'>) => createReward.mutate({ name: r.name, cost: r.cost }), [createReward]);
  const updateReward = useCallback((id: string, r: Partial<Reward>) => updateRewardMut.mutate({ id, name: r.name, cost: r.cost }), [updateRewardMut]);
  const deleteReward = useCallback((id: string) => deleteRewardMut.mutate(id), [deleteRewardMut]);

  const updateCreditValiditySettings = useCallback((s: CreditValiditySettings) => upsertSystemSetting.mutate({ key: 'credit_validity', value: s }), [upsertSystemSetting]);

  const value: SetupContextType = {
    areas, teamMembers, actionTypes, metas, professionalTypes, professionalCategories,
    rewards, creditValiditySettings, isLoading,
    addArea, updateArea, deleteArea,
    addTeamMember, updateTeamMember, deleteTeamMember,
    addActionType, updateActionType, deleteActionType,
    addMeta, updateMeta, deleteMeta,
    addProfessionalType, updateProfessionalType, deleteProfessionalType,
    addProfessionalCategory, updateProfessionalCategory, deleteProfessionalCategory,
    addReward, updateReward, deleteReward,
    updateCreditValiditySettings,
  };

  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
}

export function useSetup() {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error('useSetup must be used within SetupProvider');
  return ctx;
}
