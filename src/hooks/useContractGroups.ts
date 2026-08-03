import { useMemo } from 'react';
import { parseISO, isPast, isToday } from 'date-fns';
import { ChecklistItemWithDetails } from '@/hooks/useChecklist';

export interface ChecklistItemFull {
  id: string;
  step_order: number;
  name: string;
  status: string;
  responsible_area: string;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  checklist: {
    id: string;
    project_id: string;
    workflow_status: string;
    assigned_projetista_id: string | null;
    assigned_logistica_id: string | null;
    assigned_cs_id: string | null;
  };
}

export interface ContractGroup {
  projectId: string;
  projectName: string;
  clientName: string | null;
  foccoNumber: string | null;
  contractNumber: string | null;
  workflowStatus: string;
  userItems: ChecklistItemWithDetails[];
  allItems: ChecklistItemFull[];
  activeCount: number;
  blockedCount: number;
  completedCount: number;
  hasOverdue: boolean;
}

/**
 * Agrupa itens de checklist por contrato/projeto.
 * Compartilhado entre Minha Área (itens do colaborador) e Gestão (itens da equipe).
 */
export function useContractGroups(
  items: ChecklistItemWithDetails[],
  allProjectItems: ChecklistItemFull[]
): ContractGroup[] {
  return useMemo(() => {
    const groups = new Map<string, ContractGroup>();

    items.forEach(item => {
      const projectId = item.project?.id || 'unknown';

      if (!groups.has(projectId)) {
        groups.set(projectId, {
          projectId,
          projectName: item.project?.name || 'Projeto sem nome',
          clientName: item.project?.clients?.name || null,
          foccoNumber: item.project?.focco_project_number || null,
          contractNumber: (item.project as any)?.clients?.contract_number || null,
          workflowStatus: item.checklist?.workflow_status || 'formalizacao',
          userItems: [],
          allItems: [],
          activeCount: 0,
          blockedCount: 0,
          completedCount: 0,
          hasOverdue: false,
        });
      }

      const group = groups.get(projectId)!;
      group.userItems.push(item);

      if (item.status === 'active') {
        group.activeCount++;
        if (item.due_date && isPast(parseISO(item.due_date)) && !isToday(parseISO(item.due_date))) {
          group.hasOverdue = true;
        }
      } else if (item.status === 'blocked') {
        group.blockedCount++;
      }
    });

    allProjectItems.forEach(item => {
      const projectId = item.checklist?.project_id;
      if (projectId && groups.has(projectId)) {
        groups.get(projectId)!.allItems.push(item);
      }
    });

    groups.forEach(group => {
      group.allItems.sort((a, b) => a.step_order - b.step_order);
      group.userItems.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;

        if (a.status === 'active' && b.status === 'active') {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }

        return a.step_order - b.step_order;
      });
      group.completedCount = group.allItems.filter(i => i.status === 'completed').length;
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.hasOverdue && !b.hasOverdue) return -1;
      if (!a.hasOverdue && b.hasOverdue) return 1;
      if (a.activeCount !== b.activeCount) return b.activeCount - a.activeCount;
      return a.projectName.localeCompare(b.projectName);
    });
  }, [items, allProjectItems]);
}