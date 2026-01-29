export interface Area {
  id: string;
  name: string;
}

export interface TeamMember {
  id: string;
  name: string;
  areaId: string;
  active: boolean;
  userId?: string;
}

// Available additional fields that can be enabled per action type
export type AdditionalFieldKey = 
  | 'clientName' 
  | 'clientAge' 
  | 'clientProfession' 
  | 'presentationNumber' 
  | 'foccoProjectNumber'
  | 'contractNumber'
  | 'clientPhone'
  | 'clientEmail'
  | 'clientCpfCnpj'
  | 'clientAddress'
  | 'clientCity'
  | 'clientState'
  | 'presentedValue';

export interface ActionType {
  id: string;
  name: string;
  classification: 'relacionamento' | 'venda' | 'projeto' | 'outro' | 'seletiva' | 'apresentacao';
  impactsMetas: ('acoes' | 'vendas' | 'captacao' | 'projeto')[];
  requiresValue: boolean;
  additionalFields: boolean;
  enabledFields: AdditionalFieldKey[]; // Which specific fields are enabled
  programPoints: number;
  creditValidityType: 'global' | 'mensal' | 'anual' | 'dias' | 'personalizado' | 'sem_validade';
  creditValidityDays?: number;
  areaId?: string; // Reference to area this action type belongs to
}

export interface Meta {
  id: string;
  areaId: string;
  teamMemberId?: string; // For individual goals per team member
  type: 'acoes' | 'vendas' | 'captacao' | 'projeto' | 'categoria' | 'especificador'; // especificador for backwards compatibility
  value: number;
  categoryId?: string; // For 'categoria' type metas
  validityType: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'personalizada';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface ProfessionalType {
  id: string;
  name: string;
}

export interface ProfessionalCategory {
  id: string;
  name: string;
  order: number;
  condition: 'venda' | 'relacionamento' | 'projeto' | 'outro';
  daysToChange: number;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  validity?: number;
}

export interface Professional {
  id: string;
  name: string;
  typeId: string;
  consultantId: string;
  categoryId: string;
  lastActionDate?: string;
  lastActionTypeId?: string;
  specialDates?: SpecialDate[];
  isManualCategory?: boolean; // Indicates if category was manually set by admin
}

export interface SpecialDate {
  id: string;
  date: string;
  reason: string;
  type: 'unica' | 'mensal' | 'anual';
}

export interface Action {
  id: string;
  consultantId: string;
  professionalId: string;
  actionTypeId: string;
  date: string;
  value?: number;
  clientName?: string;
  clientAge?: number;
  clientProfession?: string;
  presentationNumber?: string;
  foccoProjectNumber?: string;
  projectId?: string;
  pointsGenerated: number;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  consultantId?: string;
  type: 'avulso' | 'recorrente';
  professionalId?: string;
}

export interface CreditTransaction {
  id: string;
  consultantId: string;
  amount: number;
  type: 'ganho' | 'resgate';
  description: string;
  date: string;
  actionId?: string;
  rewardId?: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'used';
  professionalId?: string;
}

export interface CreditValiditySettings {
  type: 'mensal' | 'anual' | 'dias' | 'sem_validade';
  days?: number; // For 'dias' type
}
