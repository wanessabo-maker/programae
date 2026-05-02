/**
 * ComercialContext — ações, especificadores e créditos
 *
 * FASE 2: Separado do AppContext monolítico.
 * Responsável por: Actions, Professionals, CreditTransactions, Reminders.
 * Isola re-renders de dados comerciais dos dados de configuração (SetupContext).
 *
 * Como usar:
 *   import { useComercial } from '@/contexts/ComercialContext';
 *   const { actions, addAction, getConsultantBalance } = useComercial();
 */

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import {
  useProfessionals, useCreateProfessional, useUpdateProfessional, useDeleteProfessional,
  useActions, useCreateAction, useUpdateAction, useDeleteAction,
  useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder,
  useCreditTransactions, useCreateCreditTransaction, useUpdateCreditTransaction, useDeleteCreditTransaction,
} from '@/hooks/useDatabase';
import { useSetup } from '@/contexts/SetupContext';
import { Professional, Action, Reminder, CreditTransaction } from '@/types';

// ── Transform helpers ────────────────────────────────────────────────────────

function transformProfessional(d: {
  id: string; name: string; type_id: string | null; consultant_id: string | null;
  category_id: string | null; last_action_date: string | null; last_action_type_id: string | null;
  is_manual_category?: boolean | null;
}): Professional {
  return {
    id: d.id, name: d.name, typeId: d.type_id || '', consultantId: d.consultant_id || '',
    categoryId: d.category_id || '', lastActionDate: d.last_action_date || '',
    lastActionTypeId: d.last_action_type_id || undefined, isManualCategory: d.is_manual_category || false,
  };
}

function transformAction(d: {
  id: string; consultant_id: string | null; professional_id: string | null; action_type_id: string | null;
  action_date: string; value: number | null; client_name: string | null; client_age: number | null;
  client_profession: string | null; presentation_number: string | null; focco_project_number: string | null;
  project_id: string | null; action_types?: { points: number | null } | null;
}): Action {
  return {
    id: d.id, consultantId: d.consultant_id || '', professionalId: d.professional_id || '',
    actionTypeId: d.action_type_id || '', date: d.action_date,
    value: d.value ?? undefined, clientName: d.client_name ?? undefined, clientAge: d.client_age ?? undefined,
    clientProfession: d.client_profession ?? undefined, presentationNumber: d.presentation_number ?? undefined,
    foccoProjectNumber: d.focco_project_number ?? undefined, projectId: d.project_id ?? undefined,
    pointsGenerated: d.action_types?.points ?? 0,
  };
}

function transformReminder(d: { id: string; title: string; reminder_date: string; consultant_id: string | null; recurrence: string | null }): Reminder {
  return { id: d.id, title: d.title, date: d.reminder_date, consultantId: d.consultant_id || '', type: d.recurrence === 'recurring' ? 'recorrente' : 'avulso' };
}

function transformCreditTransaction(d: {
  id: string; consultant_id: string | null; professional_id?: string | null; points: number;
  description: string | null; transaction_date: string | null; action_id: string | null;
  expires_at?: string | null; status?: string | null;
}): CreditTransaction {
  return {
    id: d.id, consultantId: d.consultant_id || '', professionalId: d.professional_id || undefined,
    amount: Math.abs(d.points), type: d.points >= 0 ? 'ganho' : 'resgate',
    description: d.description || '', date: d.transaction_date || new Date().toISOString().split('T')[0],
    actionId: d.action_id ?? undefined, expiresAt: d.expires_at || undefined,
    status: (d.status as CreditTransaction['status']) || 'active',
  };
}

// ── Context type ─────────────────────────────────────────────────────────────

interface ComercialContextType {
  professionals: Professional[];
  actions: Action[];
  reminders: Reminder[];
  creditTransactions: CreditTransaction[];
  isLoading: boolean;

  addProfessional: (professional: Omit<Professional, 'id'>) => Promise<string | undefined>;
  updateProfessional: (id: string, professional: Partial<Professional>) => void;
  deleteProfessional: (id: string) => void;

  addAction: (action: Omit<Action, 'id'>) => Promise<string | undefined>;
  updateAction: (id: string, action: Partial<Action>) => Promise<unknown>;
  deleteAction: (id: string) => void;

  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;

  addCreditTransaction: (transaction: Omit<CreditTransaction, 'id'> & { actionTypeId?: string }) => void;
  updateCreditTransaction: (id: string, updates: Partial<CreditTransaction>) => Promise<unknown>;
  deleteCreditTransaction: (id: string) => Promise<unknown>;
  getConsultantBalance: (consultantId: string) => number;
}

const ComercialContext = createContext<ComercialContextType | undefined>(undefined);

export function ComercialProvider({ children }: { children: ReactNode }) {
  const { actionTypes, creditValiditySettings } = useSetup();

  const { data: professionalsData, isLoading: professionalsLoading } = useProfessionals();
  const { data: actionsData, isLoading: actionsLoading } = useActions();
  const { data: remindersData, isLoading: remindersLoading } = useReminders();
  const { data: creditTransactionsData, isLoading: creditTransactionsLoading } = useCreditTransactions();

  const createProfessional = useCreateProfessional(); const updateProfessionalMut = useUpdateProfessional(); const deleteProfessionalMut = useDeleteProfessional();
  const createAction = useCreateAction(); const updateActionMut = useUpdateAction(); const deleteActionMut = useDeleteAction();
  const createReminder = useCreateReminder(); const updateReminderMut = useUpdateReminder(); const deleteReminderMut = useDeleteReminder();
  const createCreditTransaction = useCreateCreditTransaction(); const updateCreditTransactionMut = useUpdateCreditTransaction(); const deleteCreditTransactionMut = useDeleteCreditTransaction();

  const professionals = useMemo(() => professionalsData?.map(transformProfessional) || [], [professionalsData]);
  const actions = useMemo(() => actionsData?.map(transformAction) || [], [actionsData]);
  const reminders = useMemo(() => remindersData?.map(transformReminder) || [], [remindersData]);
  const creditTransactions = useMemo(() => creditTransactionsData?.map(transformCreditTransaction) || [], [creditTransactionsData]);

  const isLoading = professionalsLoading || actionsLoading || remindersLoading || creditTransactionsLoading;

  // ── Expiration date calculator ────────────────────────────────────────────
  const calculateExpirationDate = useCallback((transactionDate: string, actionTypeId?: string): string | undefined => {
    const actionType = actionTypeId ? actionTypes.find(t => t.id === actionTypeId) : null;
    let validityType: string = creditValiditySettings.type;
    let validityDays: number | undefined = creditValiditySettings.days;
    if (actionType && actionType.creditValidityType !== 'global') {
      validityType = actionType.creditValidityType;
      validityDays = actionType.creditValidityDays;
    }
    if (validityType === 'sem_validade') return undefined;
    const [yearStr, monthStr, dayStr] = transactionDate.split('-');
    const year = parseInt(yearStr, 10); const month = parseInt(monthStr, 10); const day = parseInt(dayStr, 10);
    switch (validityType) {
      case 'mensal': {
        const lastDay = new Date(year, month, 0).getDate();
        return `${yearStr}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }
      case 'anual': return `${yearStr}-12-31`;
      case 'dias':
      case 'personalizado': {
        const days = validityDays || 30;
        const futureDate = new Date(year, month - 1, day + days);
        return `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
      }
      default: return undefined;
    }
  }, [creditValiditySettings, actionTypes]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const addProfessional = useCallback(async (p: Omit<Professional, 'id'>): Promise<string | undefined> => {
    try {
      const result = await createProfessional.mutateAsync({
        name: p.name, type_id: p.typeId || null, consultant_id: p.consultantId || null,
        category_id: p.categoryId || null, last_action_date: p.lastActionDate || null, last_action_type_id: p.lastActionTypeId || null,
      });
      return result?.id;
    } catch { return undefined; }
  }, [createProfessional]);

  const updateProfessional = useCallback((id: string, p: Partial<Professional>) => {
    updateProfessionalMut.mutate({ id, name: p.name, type_id: p.typeId, consultant_id: p.consultantId, category_id: p.categoryId, last_action_date: p.lastActionDate, last_action_type_id: p.lastActionTypeId, is_manual_category: p.isManualCategory });
  }, [updateProfessionalMut]);

  const deleteProfessional = useCallback((id: string) => deleteProfessionalMut.mutate(id), [deleteProfessionalMut]);

  const addAction = useCallback(async (a: Omit<Action, 'id'>): Promise<string | undefined> => {
    try {
      const result = await createAction.mutateAsync({
        consultant_id: a.consultantId || null, professional_id: a.professionalId || null,
        action_type_id: a.actionTypeId || null, action_date: a.date, value: a.value ?? null,
        client_name: a.clientName ?? null, client_age: a.clientAge ?? null,
        client_profession: a.clientProfession ?? null, presentation_number: a.presentationNumber ?? null,
        focco_project_number: a.foccoProjectNumber ?? null, project_id: a.projectId ?? null,
      });
      return result?.id;
    } catch { return undefined; }
  }, [createAction]);

  const updateAction = useCallback((id: string, a: Partial<Action>) => {
    return updateActionMut.mutateAsync({ id, consultant_id: a.consultantId, professional_id: a.professionalId, action_type_id: a.actionTypeId, action_date: a.date, value: a.value, client_name: a.clientName, client_age: a.clientAge, client_profession: a.clientProfession, presentation_number: a.presentationNumber });
  }, [updateActionMut]);

  const deleteAction = useCallback((id: string) => deleteActionMut.mutate(id), [deleteActionMut]);

  const addReminder = useCallback((r: Omit<Reminder, 'id'>) => createReminder.mutate({ title: r.title, reminder_date: r.date, consultant_id: r.consultantId || null, recurrence: r.type === 'recorrente' ? 'recurring' : 'once' }), [createReminder]);
  const updateReminder = useCallback((id: string, r: Partial<Reminder>) => updateReminderMut.mutate({ id, title: r.title, reminder_date: r.date, consultant_id: r.consultantId, recurrence: r.type === 'recorrente' ? 'recurring' : 'once' }), [updateReminderMut]);
  const deleteReminder = useCallback((id: string) => deleteReminderMut.mutate(id), [deleteReminderMut]);

  const addCreditTransaction = useCallback((t: Omit<CreditTransaction, 'id'> & { actionTypeId?: string }) => {
    const points = t.type === 'ganho' ? t.amount : -t.amount;
    const expiresAt = t.type === 'ganho' ? (t.expiresAt || calculateExpirationDate(t.date, t.actionTypeId)) : undefined;
    createCreditTransaction.mutate({ consultant_id: t.consultantId || null, points, description: t.description, transaction_date: t.date, action_id: t.actionId ?? null, expires_at: expiresAt, status: t.status || 'active' });
  }, [createCreditTransaction, calculateExpirationDate]);

  const updateCreditTransaction = useCallback((id: string, u: Partial<CreditTransaction>) => {
    return updateCreditTransactionMut.mutateAsync({ id, expires_at: u.expiresAt, status: u.status, description: u.description, consultant_id: u.consultantId, points: u.amount, transaction_date: u.date });
  }, [updateCreditTransactionMut]);

  const deleteCreditTransaction = useCallback((id: string) => deleteCreditTransactionMut.mutateAsync(id), [deleteCreditTransactionMut]);

  const getConsultantBalance = useCallback((consultantId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return creditTransactions.filter(t => {
      if (t.consultantId !== consultantId) return false;
      if (t.type === 'resgate') return true;
      if (t.status === 'expired' || t.status === 'used') return false;
      if (t.expiresAt && t.expiresAt < today) return false;
      return true;
    }).reduce((acc, t) => t.type === 'ganho' ? acc + t.amount : acc - t.amount, 0);
  }, [creditTransactions]);

  const value: ComercialContextType = {
    professionals, actions, reminders, creditTransactions, isLoading,
    addProfessional, updateProfessional, deleteProfessional,
    addAction, updateAction, deleteAction,
    addReminder, updateReminder, deleteReminder,
    addCreditTransaction, updateCreditTransaction, deleteCreditTransaction, getConsultantBalance,
  };

  return <ComercialContext.Provider value={value}>{children}</ComercialContext.Provider>;
}

export function useComercial() {
  const ctx = useContext(ComercialContext);
  if (!ctx) throw new Error('useComercial must be used within ComercialProvider');
  return ctx;
}
