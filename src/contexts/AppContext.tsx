import React, { createContext, useContext, useState, ReactNode } from 'react';
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

interface AppState {
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
}

interface AppContextType extends AppState {
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
  addProfessional: (professional: Omit<Professional, 'id'>) => void;
  updateProfessional: (id: string, professional: Partial<Professional>) => void;
  deleteProfessional: (id: string) => void;
  
  // Actions
  addAction: (action: Omit<Action, 'id'>) => void;
  updateAction: (id: string, action: Partial<Action>) => void;
  deleteAction: (id: string) => void;
  
  // Reminders
  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  
  // Credits
  addCreditTransaction: (transaction: Omit<CreditTransaction, 'id'>) => void;
  getConsultantBalance: (consultantId: string) => number;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const initialState: AppState = {
  areas: [
    { id: '1', name: 'Comercial' },
    { id: '2', name: 'Projetos' },
  ],
  teamMembers: [
    { id: '1', name: 'Ana Silva', areaId: '1', active: true },
    { id: '2', name: 'Carlos Santos', areaId: '1', active: true },
    { id: '3', name: 'Marina Oliveira', areaId: '2', active: true },
  ],
  actionTypes: [
    { id: '1', name: 'Visita', classification: 'relacionamento', impactsMetas: ['acoes'], requiresValue: false, additionalFields: false, programPoints: 5 },
    { id: '2', name: 'Venda', classification: 'venda', impactsMetas: ['vendas', 'acoes'], requiresValue: true, additionalFields: false, programPoints: 20 },
    { id: '3', name: 'Apresentação de Projeto', classification: 'projeto', impactsMetas: ['projeto', 'acoes'], requiresValue: false, additionalFields: true, programPoints: 15 },
    { id: '4', name: 'Captação', classification: 'relacionamento', impactsMetas: ['captacao', 'acoes'], requiresValue: false, additionalFields: false, programPoints: 10 },
  ],
  metas: [
    { id: '1', areaId: '1', type: 'vendas', value: 100000 },
    { id: '2', areaId: '1', type: 'acoes', value: 50 },
    { id: '3', areaId: '1', type: 'captacao', value: 20 },
    { id: '4', areaId: '2', type: 'projeto', value: 10 },
  ],
  professionalTypes: [
    { id: '1', name: 'Arquiteto' },
    { id: '2', name: 'Designer de Interiores' },
    { id: '3', name: 'Engenheiro' },
  ],
  professionalCategories: [
    { id: '1', name: 'Ativo', order: 1, condition: 'relacionamento', daysToChange: 30 },
    { id: '2', name: 'Em acompanhamento', order: 2, condition: 'relacionamento', daysToChange: 60 },
    { id: '3', name: 'Distante', order: 3, condition: 'outro', daysToChange: 90 },
  ],
  rewards: [
    { id: '1', name: 'Vale Almoço', cost: 50 },
    { id: '2', name: 'Day Off', cost: 200 },
    { id: '3', name: 'Vale Presente R$100', cost: 100 },
  ],
  professionals: [
    { id: '1', name: 'Roberto Mendes', typeId: '1', consultantId: '1', categoryId: '1', lastActionDate: '2026-01-10', lastActionType: 'Visita' },
    { id: '2', name: 'Fernanda Costa', typeId: '2', consultantId: '1', categoryId: '2', lastActionDate: '2025-12-20', lastActionType: 'Captação' },
    { id: '3', name: 'Paulo Ribeiro', typeId: '1', consultantId: '2', categoryId: '1', lastActionDate: '2026-01-08', lastActionType: 'Venda' },
  ],
  actions: [
    { id: '1', consultantId: '1', professionalId: '1', actionTypeId: '1', date: '2026-01-10', pointsGenerated: 5 },
    { id: '2', consultantId: '1', professionalId: '2', actionTypeId: '4', date: '2025-12-20', pointsGenerated: 10 },
    { id: '3', consultantId: '2', professionalId: '3', actionTypeId: '2', date: '2026-01-08', value: 15000, pointsGenerated: 20 },
  ],
  reminders: [
    { id: '1', title: 'Follow-up Roberto Mendes', date: '2026-01-20', consultantId: '1', type: 'avulso', professionalId: '1' },
  ],
  creditTransactions: [
    { id: '1', consultantId: '1', amount: 5, type: 'ganho', description: 'Visita - Roberto Mendes', date: '2026-01-10', actionId: '1' },
    { id: '2', consultantId: '1', amount: 10, type: 'ganho', description: 'Captação - Fernanda Costa', date: '2025-12-20', actionId: '2' },
    { id: '3', consultantId: '2', amount: 20, type: 'ganho', description: 'Venda - Paulo Ribeiro', date: '2026-01-08', actionId: '3' },
  ],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  // Generic CRUD helpers
  const addItem = (key: keyof AppState, item: Record<string, unknown>) => {
    setState(prev => ({
      ...prev,
      [key]: [...(prev[key] as Array<{ id: string }>), { ...item, id: generateId() }],
    }));
  };

  const updateItem = (key: keyof AppState, id: string, updates: Record<string, unknown>) => {
    setState(prev => ({
      ...prev,
      [key]: (prev[key] as Array<{ id: string }>).map(item => 
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const deleteItem = (key: keyof AppState, id: string) => {
    setState(prev => ({
      ...prev,
      [key]: (prev[key] as Array<{ id: string }>).filter(item => item.id !== id),
    }));
  };

  const getConsultantBalance = (consultantId: string) => {
    return state.creditTransactions
      .filter(t => t.consultantId === consultantId)
      .reduce((acc, t) => t.type === 'ganho' ? acc + t.amount : acc - t.amount, 0);
  };

  const value: AppContextType = {
    ...state,
    addArea: (area) => addItem('areas', area),
    updateArea: (id, area) => updateItem('areas', id, area),
    deleteArea: (id) => deleteItem('areas', id),
    addTeamMember: (member) => addItem('teamMembers', member),
    updateTeamMember: (id, member) => updateItem('teamMembers', id, member),
    deleteTeamMember: (id) => deleteItem('teamMembers', id),
    addActionType: (type) => addItem('actionTypes', type),
    updateActionType: (id, type) => updateItem('actionTypes', id, type),
    deleteActionType: (id) => deleteItem('actionTypes', id),
    addMeta: (meta) => addItem('metas', meta),
    updateMeta: (id, meta) => updateItem('metas', id, meta),
    deleteMeta: (id) => deleteItem('metas', id),
    addProfessionalType: (type) => addItem('professionalTypes', type),
    updateProfessionalType: (id, type) => updateItem('professionalTypes', id, type),
    deleteProfessionalType: (id) => deleteItem('professionalTypes', id),
    addProfessionalCategory: (category) => addItem('professionalCategories', category),
    updateProfessionalCategory: (id, category) => updateItem('professionalCategories', id, category),
    deleteProfessionalCategory: (id) => deleteItem('professionalCategories', id),
    addReward: (reward) => addItem('rewards', reward),
    updateReward: (id, reward) => updateItem('rewards', id, reward),
    deleteReward: (id) => deleteItem('rewards', id),
    addProfessional: (professional) => addItem('professionals', professional),
    updateProfessional: (id, professional) => updateItem('professionals', id, professional),
    deleteProfessional: (id) => deleteItem('professionals', id),
    addAction: (action) => addItem('actions', action),
    updateAction: (id, action) => updateItem('actions', id, action),
    deleteAction: (id) => deleteItem('actions', id),
    addReminder: (reminder) => addItem('reminders', reminder),
    updateReminder: (id, reminder) => updateItem('reminders', id, reminder),
    deleteReminder: (id) => deleteItem('reminders', id),
    addCreditTransaction: (transaction) => addItem('creditTransactions', transaction),
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
