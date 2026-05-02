/**
 * AppContext — shim de compatibilidade retroativa
 *
 * FASE 2: O AppContext original foi dividido em SetupContext e ComercialContext.
 * Este arquivo mantém o hook `useApp()` funcionando SEM alterar nenhum componente existente.
 *
 * MIGRAÇÃO GRADUAL:
 * - Componentes novos devem importar useSetup() ou useComercial() diretamente
 * - Componentes existentes continuam funcionando com useApp() sem alteração
 * - À medida que os componentes forem migrados, este shim pode ser removido
 *
 * Exemplo de migração gradual:
 *   ANTES: const { areas, actions } = useApp();
 *   DEPOIS: const { areas } = useSetup(); const { actions } = useComercial();
 */

import { useSetup } from '@/contexts/SetupContext';
import { useComercial } from '@/contexts/ComercialContext';

export function AppProvider({ children }: { children: React.ReactNode }) {
  // AppProvider agora é apenas um alias — os providers reais estão em App.tsx
  return <>{children}</>;
}

/** Hook de compatibilidade retroativa. Novos componentes devem usar useSetup() / useComercial(). */
export function useApp() {
  const setup = useSetup();
  const comercial = useComercial();

  return {
    // Setup data
    areas: setup.areas,
    teamMembers: setup.teamMembers,
    actionTypes: setup.actionTypes,
    metas: setup.metas,
    professionalTypes: setup.professionalTypes,
    professionalCategories: setup.professionalCategories,
    rewards: setup.rewards,
    creditValiditySettings: setup.creditValiditySettings,

    // Comercial data
    professionals: comercial.professionals,
    actions: comercial.actions,
    reminders: comercial.reminders,
    creditTransactions: comercial.creditTransactions,

    // Combined loading state
    isLoading: setup.isLoading || comercial.isLoading,

    // Setup mutations
    addArea: setup.addArea, updateArea: setup.updateArea, deleteArea: setup.deleteArea,
    addTeamMember: setup.addTeamMember, updateTeamMember: setup.updateTeamMember, deleteTeamMember: setup.deleteTeamMember,
    addActionType: setup.addActionType, updateActionType: setup.updateActionType, deleteActionType: setup.deleteActionType,
    addMeta: setup.addMeta, updateMeta: setup.updateMeta, deleteMeta: setup.deleteMeta,
    addProfessionalType: setup.addProfessionalType, updateProfessionalType: setup.updateProfessionalType, deleteProfessionalType: setup.deleteProfessionalType,
    addProfessionalCategory: setup.addProfessionalCategory, updateProfessionalCategory: setup.updateProfessionalCategory, deleteProfessionalCategory: setup.deleteProfessionalCategory,
    addReward: setup.addReward, updateReward: setup.updateReward, deleteReward: setup.deleteReward,
    updateCreditValiditySettings: setup.updateCreditValiditySettings,

    // Comercial mutations
    addProfessional: comercial.addProfessional, updateProfessional: comercial.updateProfessional, deleteProfessional: comercial.deleteProfessional,
    addAction: comercial.addAction, updateAction: comercial.updateAction, deleteAction: comercial.deleteAction,
    addReminder: comercial.addReminder, updateReminder: comercial.updateReminder, deleteReminder: comercial.deleteReminder,
    addCreditTransaction: comercial.addCreditTransaction, updateCreditTransaction: comercial.updateCreditTransaction,
    deleteCreditTransaction: comercial.deleteCreditTransaction, getConsultantBalance: comercial.getConsultantBalance,
  };
}
