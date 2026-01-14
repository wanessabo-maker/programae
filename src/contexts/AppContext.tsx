import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import {
  useAreas, useCreateArea, useUpdateArea, useDeleteArea,
  useTeamMembers, useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember,
  useActionTypes, useCreateActionType, useUpdateActionType, useDeleteActionType,
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal,
  useProfessionalTypes, useCreateProfessionalType, useUpdateProfessionalType, useDeleteProfessionalType,
  useProfessionalCategories, useCreateProfessionalCategory, useUpdateProfessionalCategory, useDeleteProfessionalCategory,
  useRewards, useCreateReward, useUpdateReward, useDeleteReward,
  useProfessionals, useCreateProfessional, useUpdateProfessional, useDeleteProfessional,
  useActions, useCreateAction, useUpdateAction, useDeleteAction,
  useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder,
  useCreditTransactions, useCreateCreditTransaction, useDeleteCreditTransaction,
} from '@/hooks/useDatabase';
import {
  Area,
  TeamMember,
  ActionType,
  Meta,
  ProfessionalType,
  ProfessionalCategory,
  Reward,
  Professional,
  Action,
  Reminder,
  CreditTransaction,
} from '@/types';

interface AppContextType {
  // Data
  areas: Area[];
  teamMembers: TeamMember[];
  actionTypes: ActionType[];
  metas: Meta[];
  professionalTypes: ProfessionalType[];
  professionalCategories: ProfessionalCategory[];
  rewards: Reward[];
  professionals: Professional[];
  actions: Action[];
  reminders: Reminder[];
  creditTransactions: CreditTransaction[];
  
  // Loading states
  isLoading: boolean;
  
  // Areas
  addArea: (area: Omit<Area, 'id'>) => void;
  updateArea: (id: string, area: Partial<Area>) => void;
  deleteArea: (id: string) => void;
  
  // Team Members
  addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
  updateTeamMember: (id: string, member: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
  
  // Action Types
  addActionType: (type: Omit<ActionType, 'id'>) => void;
  updateActionType: (id: string, type: Partial<ActionType>) => void;
  deleteActionType: (id: string) => void;
  
  // Metas
  addMeta: (meta: Omit<Meta, 'id'>) => void;
  updateMeta: (id: string, meta: Partial<Meta>) => void;
  deleteMeta: (id: string) => void;
  
  // Professional Types
  addProfessionalType: (type: Omit<ProfessionalType, 'id'>) => void;
  updateProfessionalType: (id: string, type: Partial<ProfessionalType>) => void;
  deleteProfessionalType: (id: string) => void;
  
  // Professional Categories
  addProfessionalCategory: (category: Omit<ProfessionalCategory, 'id'>) => void;
  updateProfessionalCategory: (id: string, category: Partial<ProfessionalCategory>) => void;
  deleteProfessionalCategory: (id: string) => void;
  
  // Rewards
  addReward: (reward: Omit<Reward, 'id'>) => void;
  updateReward: (id: string, reward: Partial<Reward>) => void;
  deleteReward: (id: string) => void;
  
  // Professionals
  addProfessional: (professional: Omit<Professional, 'id'>) => Promise<string | undefined>;
  updateProfessional: (id: string, professional: Partial<Professional>) => void;
  deleteProfessional: (id: string) => void;
  
  // Actions
  addAction: (action: Omit<Action, 'id'>) => Promise<string | undefined>;
  updateAction: (id: string, action: Partial<Action>) => void;
  deleteAction: (id: string) => void;
  
  // Reminders
  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  
  // Credits
  addCreditTransaction: (transaction: Omit<CreditTransaction, 'id'>) => void;
  deleteCreditTransaction: (id: string) => void;
  getConsultantBalance: (consultantId: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to transform database format to app format
function transformArea(dbArea: { id: string; name: string }): Area {
  return { id: dbArea.id, name: dbArea.name };
}

function transformTeamMember(dbMember: { id: string; name: string; area_id: string | null; active: boolean | null }): TeamMember {
  return {
    id: dbMember.id,
    name: dbMember.name,
    areaId: dbMember.area_id || '',
    active: dbMember.active ?? true,
  };
}

function transformActionType(dbType: {
  id: string;
  name: string;
  classification: string;
  impacts: string[] | null;
  requires_value: boolean | null;
  additional_fields: boolean | null;
  points: number | null;
}): ActionType {
  return {
    id: dbType.id,
    name: dbType.name,
    classification: dbType.classification as ActionType['classification'],
    impactsMetas: (dbType.impacts || []) as ActionType['impactsMetas'],
    requiresValue: dbType.requires_value ?? false,
    additionalFields: dbType.additional_fields ?? false,
    programPoints: dbType.points ?? 0,
  };
}

function transformGoal(dbGoal: { id: string; area_id: string | null; metric: string; value: number; category_id?: string | null }): Meta {
  return {
    id: dbGoal.id,
    areaId: dbGoal.area_id || '',
    type: dbGoal.metric as Meta['type'],
    value: Number(dbGoal.value),
    categoryId: dbGoal.category_id || undefined,
  };
}

function transformProfessionalType(dbType: { id: string; name: string }): ProfessionalType {
  return { id: dbType.id, name: dbType.name };
}

function transformProfessionalCategory(dbCat: {
  id: string;
  name: string;
  condition: string;
  days: number;
  hierarchy: number;
  points: number | null;
}): ProfessionalCategory {
  return {
    id: dbCat.id,
    name: dbCat.name,
    order: dbCat.hierarchy,
    condition: dbCat.condition as ProfessionalCategory['condition'],
    daysToChange: dbCat.days,
  };
}

function transformReward(dbReward: { id: string; name: string; cost: number }): Reward {
  return { id: dbReward.id, name: dbReward.name, cost: dbReward.cost };
}

function transformProfessional(dbProf: {
  id: string;
  name: string;
  type_id: string | null;
  consultant_id: string | null;
  category_id: string | null;
  last_action_date: string | null;
  last_action_type_id: string | null;
}): Professional {
  return {
    id: dbProf.id,
    name: dbProf.name,
    typeId: dbProf.type_id || '',
    consultantId: dbProf.consultant_id || '',
    categoryId: dbProf.category_id || '',
    lastActionDate: dbProf.last_action_date || '',
    lastActionTypeId: dbProf.last_action_type_id || undefined,
  };
}

function transformAction(dbAction: {
  id: string;
  consultant_id: string | null;
  professional_id: string | null;
  action_type_id: string | null;
  action_date: string;
  value: number | null;
  client_name: string | null;
  client_age: number | null;
  client_profession: string | null;
  presentation_number: string | null;
  action_types?: { points: number | null } | null;
}): Action {
  return {
    id: dbAction.id,
    consultantId: dbAction.consultant_id || '',
    professionalId: dbAction.professional_id || '',
    actionTypeId: dbAction.action_type_id || '',
    date: dbAction.action_date,
    value: dbAction.value ?? undefined,
    clientName: dbAction.client_name ?? undefined,
    clientAge: dbAction.client_age ?? undefined,
    clientProfession: dbAction.client_profession ?? undefined,
    presentationNumber: dbAction.presentation_number ?? undefined,
    pointsGenerated: dbAction.action_types?.points ?? 0,
  };
}

function transformReminder(dbReminder: {
  id: string;
  title: string;
  reminder_date: string;
  consultant_id: string | null;
  recurrence: string | null;
}): Reminder {
  return {
    id: dbReminder.id,
    title: dbReminder.title,
    date: dbReminder.reminder_date,
    consultantId: dbReminder.consultant_id || '',
    type: dbReminder.recurrence === 'recurring' ? 'recorrente' : 'avulso',
  };
}

function transformCreditTransaction(dbTx: {
  id: string;
  consultant_id: string | null;
  points: number;
  description: string | null;
  transaction_date: string | null;
  action_id: string | null;
}): CreditTransaction {
  const isGain = dbTx.points >= 0;
  return {
    id: dbTx.id,
    consultantId: dbTx.consultant_id || '',
    amount: Math.abs(dbTx.points),
    type: isGain ? 'ganho' : 'resgate',
    description: dbTx.description || '',
    date: dbTx.transaction_date || new Date().toISOString().split('T')[0],
    actionId: dbTx.action_id ?? undefined,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Queries
  const { data: areasData, isLoading: areasLoading } = useAreas();
  const { data: teamMembersData, isLoading: teamMembersLoading } = useTeamMembers();
  const { data: actionTypesData, isLoading: actionTypesLoading } = useActionTypes();
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: professionalTypesData, isLoading: professionalTypesLoading } = useProfessionalTypes();
  const { data: professionalCategoriesData, isLoading: professionalCategoriesLoading } = useProfessionalCategories();
  const { data: rewardsData, isLoading: rewardsLoading } = useRewards();
  const { data: professionalsData, isLoading: professionalsLoading } = useProfessionals();
  const { data: actionsData, isLoading: actionsLoading } = useActions();
  const { data: remindersData, isLoading: remindersLoading } = useReminders();
  const { data: creditTransactionsData, isLoading: creditTransactionsLoading } = useCreditTransactions();

  // Mutations
  const createArea = useCreateArea();
  const updateAreaMutation = useUpdateArea();
  const deleteAreaMutation = useDeleteArea();
  
  const createTeamMember = useCreateTeamMember();
  const updateTeamMemberMutation = useUpdateTeamMember();
  const deleteTeamMemberMutation = useDeleteTeamMember();
  
  const createActionType = useCreateActionType();
  const updateActionTypeMutation = useUpdateActionType();
  const deleteActionTypeMutation = useDeleteActionType();
  
  const createGoal = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  
  const createProfessionalType = useCreateProfessionalType();
  const updateProfessionalTypeMutation = useUpdateProfessionalType();
  const deleteProfessionalTypeMutation = useDeleteProfessionalType();
  
  const createProfessionalCategory = useCreateProfessionalCategory();
  const updateProfessionalCategoryMutation = useUpdateProfessionalCategory();
  const deleteProfessionalCategoryMutation = useDeleteProfessionalCategory();
  
  const createReward = useCreateReward();
  const updateRewardMutation = useUpdateReward();
  const deleteRewardMutation = useDeleteReward();
  
  const createProfessional = useCreateProfessional();
  const updateProfessionalMutation = useUpdateProfessional();
  const deleteProfessionalMutation = useDeleteProfessional();
  
  const createAction = useCreateAction();
  const updateActionMutation = useUpdateAction();
  const deleteActionMutation = useDeleteAction();
  
  const createReminder = useCreateReminder();
  const updateReminderMutation = useUpdateReminder();
  const deleteReminderMutation = useDeleteReminder();
  
  const createCreditTransaction = useCreateCreditTransaction();
  const deleteCreditTransactionMutation = useDeleteCreditTransaction();

  // Transform data
  const areas = useMemo(() => areasData?.map(transformArea) || [], [areasData]);
  const teamMembers = useMemo(() => teamMembersData?.map(transformTeamMember) || [], [teamMembersData]);
  const actionTypes = useMemo(() => actionTypesData?.map(transformActionType) || [], [actionTypesData]);
  const metas = useMemo(() => goalsData?.map(transformGoal) || [], [goalsData]);
  const professionalTypes = useMemo(() => professionalTypesData?.map(transformProfessionalType) || [], [professionalTypesData]);
  const professionalCategories = useMemo(() => professionalCategoriesData?.map(transformProfessionalCategory) || [], [professionalCategoriesData]);
  const rewards = useMemo(() => rewardsData?.map(transformReward) || [], [rewardsData]);
  const professionals = useMemo(() => professionalsData?.map(transformProfessional) || [], [professionalsData]);
  const actions = useMemo(() => actionsData?.map(transformAction) || [], [actionsData]);
  const reminders = useMemo(() => remindersData?.map(transformReminder) || [], [remindersData]);
  const creditTransactions = useMemo(() => creditTransactionsData?.map(transformCreditTransaction) || [], [creditTransactionsData]);

  const isLoading = areasLoading || teamMembersLoading || actionTypesLoading || goalsLoading ||
    professionalTypesLoading || professionalCategoriesLoading || rewardsLoading ||
    professionalsLoading || actionsLoading || remindersLoading || creditTransactionsLoading;

  // CRUD handlers
  const addArea = useCallback((area: Omit<Area, 'id'>) => {
    createArea.mutate(area.name);
  }, [createArea]);

  const updateArea = useCallback((id: string, area: Partial<Area>) => {
    if (area.name) updateAreaMutation.mutate({ id, name: area.name });
  }, [updateAreaMutation]);

  const deleteArea = useCallback((id: string) => {
    deleteAreaMutation.mutate(id);
  }, [deleteAreaMutation]);

  const addTeamMember = useCallback((member: Omit<TeamMember, 'id'>) => {
    createTeamMember.mutate({
      name: member.name,
      area_id: member.areaId || null,
      active: member.active,
    });
  }, [createTeamMember]);

  const updateTeamMember = useCallback((id: string, member: Partial<TeamMember>) => {
    updateTeamMemberMutation.mutate({
      id,
      name: member.name,
      area_id: member.areaId ?? undefined,
      active: member.active,
    });
  }, [updateTeamMemberMutation]);

  const deleteTeamMember = useCallback((id: string) => {
    deleteTeamMemberMutation.mutate(id);
  }, [deleteTeamMemberMutation]);

  const addActionType = useCallback((type: Omit<ActionType, 'id'>) => {
    createActionType.mutate({
      name: type.name,
      classification: type.classification,
      impacts: type.impactsMetas,
      requires_value: type.requiresValue,
      additional_fields: type.additionalFields,
      points: type.programPoints,
    });
  }, [createActionType]);

  const updateActionType = useCallback((id: string, type: Partial<ActionType>) => {
    updateActionTypeMutation.mutate({
      id,
      name: type.name,
      classification: type.classification,
      impacts: type.impactsMetas,
      requires_value: type.requiresValue,
      additional_fields: type.additionalFields,
      points: type.programPoints,
    });
  }, [updateActionTypeMutation]);

  const deleteActionType = useCallback((id: string) => {
    deleteActionTypeMutation.mutate(id);
  }, [deleteActionTypeMutation]);

  const addMeta = useCallback((meta: Omit<Meta, 'id'>) => {
    createGoal.mutate({
      area_id: meta.areaId,
      metric: meta.type,
      value: meta.value,
      category_id: meta.categoryId,
    });
  }, [createGoal]);

  const updateMeta = useCallback((id: string, meta: Partial<Meta>) => {
    updateGoalMutation.mutate({
      id,
      area_id: meta.areaId,
      metric: meta.type,
      value: meta.value,
      category_id: meta.categoryId,
    });
  }, [updateGoalMutation]);

  const deleteMeta = useCallback((id: string) => {
    deleteGoalMutation.mutate(id);
  }, [deleteGoalMutation]);

  const addProfessionalType = useCallback((type: Omit<ProfessionalType, 'id'>) => {
    createProfessionalType.mutate(type.name);
  }, [createProfessionalType]);

  const updateProfessionalType = useCallback((id: string, type: Partial<ProfessionalType>) => {
    if (type.name) updateProfessionalTypeMutation.mutate({ id, name: type.name });
  }, [updateProfessionalTypeMutation]);

  const deleteProfessionalType = useCallback((id: string) => {
    deleteProfessionalTypeMutation.mutate(id);
  }, [deleteProfessionalTypeMutation]);

  const addProfessionalCategory = useCallback((category: Omit<ProfessionalCategory, 'id'>) => {
    createProfessionalCategory.mutate({
      name: category.name,
      condition: category.condition,
      days: category.daysToChange,
      hierarchy: category.order,
    });
  }, [createProfessionalCategory]);

  const updateProfessionalCategory = useCallback((id: string, category: Partial<ProfessionalCategory>) => {
    updateProfessionalCategoryMutation.mutate({
      id,
      name: category.name,
      condition: category.condition,
      days: category.daysToChange,
      hierarchy: category.order,
    });
  }, [updateProfessionalCategoryMutation]);

  const deleteProfessionalCategory = useCallback((id: string) => {
    deleteProfessionalCategoryMutation.mutate(id);
  }, [deleteProfessionalCategoryMutation]);

  const addReward = useCallback((reward: Omit<Reward, 'id'>) => {
    createReward.mutate({ name: reward.name, cost: reward.cost });
  }, [createReward]);

  const updateReward = useCallback((id: string, reward: Partial<Reward>) => {
    updateRewardMutation.mutate({ id, name: reward.name, cost: reward.cost });
  }, [updateRewardMutation]);

  const deleteReward = useCallback((id: string) => {
    deleteRewardMutation.mutate(id);
  }, [deleteRewardMutation]);

  const addProfessional = useCallback(async (professional: Omit<Professional, 'id'>): Promise<string | undefined> => {
    try {
      const result = await createProfessional.mutateAsync({
        name: professional.name,
        type_id: professional.typeId || null,
        consultant_id: professional.consultantId || null,
        category_id: professional.categoryId || null,
        last_action_date: professional.lastActionDate || null,
        last_action_type_id: professional.lastActionTypeId || null,
      });
      return result?.id;
    } catch (error) {
      console.error('Error creating professional:', error);
      return undefined;
    }
  }, [createProfessional]);

  const updateProfessional = useCallback((id: string, professional: Partial<Professional>) => {
    updateProfessionalMutation.mutate({
      id,
      name: professional.name,
      type_id: professional.typeId,
      consultant_id: professional.consultantId,
      category_id: professional.categoryId,
      last_action_date: professional.lastActionDate,
      last_action_type_id: professional.lastActionTypeId,
    });
  }, [updateProfessionalMutation]);

  const deleteProfessional = useCallback((id: string) => {
    deleteProfessionalMutation.mutate(id);
  }, [deleteProfessionalMutation]);

  const addAction = useCallback(async (action: Omit<Action, 'id'>): Promise<string | undefined> => {
    try {
      const result = await createAction.mutateAsync({
        consultant_id: action.consultantId || null,
        professional_id: action.professionalId || null,
        action_type_id: action.actionTypeId || null,
        action_date: action.date,
        value: action.value ?? null,
        client_name: action.clientName ?? null,
        client_age: action.clientAge ?? null,
        client_profession: action.clientProfession ?? null,
        presentation_number: action.presentationNumber ?? null,
      });
      return result?.id;
    } catch (error) {
      console.error('Error creating action:', error);
      return undefined;
    }
  }, [createAction]);

  const updateAction = useCallback((id: string, action: Partial<Action>) => {
    updateActionMutation.mutate({
      id,
      consultant_id: action.consultantId,
      professional_id: action.professionalId,
      action_type_id: action.actionTypeId,
      action_date: action.date,
      value: action.value,
      client_name: action.clientName,
      client_age: action.clientAge,
      client_profession: action.clientProfession,
      presentation_number: action.presentationNumber,
    });
  }, [updateActionMutation]);

  const deleteAction = useCallback((id: string) => {
    deleteActionMutation.mutate(id);
  }, [deleteActionMutation]);

  const addReminder = useCallback((reminder: Omit<Reminder, 'id'>) => {
    createReminder.mutate({
      title: reminder.title,
      reminder_date: reminder.date,
      consultant_id: reminder.consultantId || null,
      recurrence: reminder.type === 'recorrente' ? 'recurring' : 'once',
    });
  }, [createReminder]);

  const updateReminder = useCallback((id: string, reminder: Partial<Reminder>) => {
    updateReminderMutation.mutate({
      id,
      title: reminder.title,
      reminder_date: reminder.date,
      consultant_id: reminder.consultantId,
      recurrence: reminder.type === 'recorrente' ? 'recurring' : 'once',
    });
  }, [updateReminderMutation]);

  const deleteReminder = useCallback((id: string) => {
    deleteReminderMutation.mutate(id);
  }, [deleteReminderMutation]);

  const addCreditTransaction = useCallback((transaction: Omit<CreditTransaction, 'id'>) => {
    const points = transaction.type === 'ganho' ? transaction.amount : -transaction.amount;
    createCreditTransaction.mutate({
      consultant_id: transaction.consultantId || null,
      points,
      description: transaction.description,
      transaction_date: transaction.date,
      action_id: transaction.actionId ?? null,
    });
  }, [createCreditTransaction]);

  const deleteCreditTransaction = useCallback((id: string) => {
    deleteCreditTransactionMutation.mutate(id);
  }, [deleteCreditTransactionMutation]);

  const getConsultantBalance = useCallback((consultantId: string) => {
    return creditTransactions
      .filter(t => t.consultantId === consultantId)
      .reduce((acc, t) => t.type === 'ganho' ? acc + t.amount : acc - t.amount, 0);
  }, [creditTransactions]);

  const value: AppContextType = {
    areas,
    teamMembers,
    actionTypes,
    metas,
    professionalTypes,
    professionalCategories,
    rewards,
    professionals,
    actions,
    reminders,
    creditTransactions,
    isLoading,
    addArea,
    updateArea,
    deleteArea,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    addActionType,
    updateActionType,
    deleteActionType,
    addMeta,
    updateMeta,
    deleteMeta,
    addProfessionalType,
    updateProfessionalType,
    deleteProfessionalType,
    addProfessionalCategory,
    updateProfessionalCategory,
    deleteProfessionalCategory,
    addReward,
    updateReward,
    deleteReward,
    addProfessional,
    updateProfessional,
    deleteProfessional,
    addAction,
    updateAction,
    deleteAction,
    addReminder,
    updateReminder,
    deleteReminder,
    addCreditTransaction,
    deleteCreditTransaction,
    getConsultantBalance,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
