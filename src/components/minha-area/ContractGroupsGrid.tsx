import { useState } from 'react';
import { format, parseISO, isPast, isToday, differenceInBusinessDays, addBusinessDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle2,
  Clock,
  FileText,
  User,
  Building2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getWorkflowStatusLabel, ChecklistItemWithDetails } from '@/hooks/useChecklist';
import type { ContractGroup } from '@/hooks/useContractGroups';

export function getDueDateStatus(dueDate: string | null) {
  if (!dueDate) return { status: 'none', label: 'Sem prazo', color: 'text-muted-foreground' };

  const date = parseISO(dueDate);
  const daysUntil = differenceInBusinessDays(date, new Date());

  if (isPast(date) && !isToday(date)) {
    return { status: 'overdue', label: `Atrasado (${Math.abs(daysUntil)} du)`, color: 'text-destructive' };
  }
  if (isToday(date)) return { status: 'today', label: 'Hoje', color: 'text-orange-600' };
  if (daysUntil <= 2) return { status: 'soon', label: `${daysUntil} du`, color: 'text-orange-500' };
  return { status: 'ok', label: format(date, 'dd/MM', { locale: ptBR }), color: 'text-muted-foreground' };
}

interface Props {
  groups: ContractGroup[];
  onCompleteItem: (item: ChecklistItemWithDetails) => void;
  emptyTitle: string;
  emptyDescription: string;
}

export function ContractGroupsGrid({ groups, onCompleteItem, emptyTitle, emptyDescription }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (projectId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(projectId) ? next.delete(projectId) : next.add(projectId);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-medium mb-2">{emptyTitle}</h3>
          <p className="text-muted-foreground text-sm">{emptyDescription}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map(group => {
        const isExpanded = expanded.has(group.projectId);

        return (
          <Card
            key={group.projectId}
            className={`border-2 border-black/10 shadow-md ${group.hasOverdue ? 'border-l-4 border-l-destructive' : ''}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-black/10">
                <div className="flex-1 min-w-0">
                  {group.clientName && (
                    <p className="text-base font-bold text-black truncate flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0 text-black/70" />
                      {group.clientName}
                    </p>
                  )}
                  {group.foccoNumber && (
                    <p className="text-xs font-bold text-black flex items-center gap-2 mt-1">
                      <FileText className="h-3 w-3 shrink-0 text-black" />
                      FOCCO {group.foccoNumber}
                    </p>
                  )}
                  {group.contractNumber && (
                    <p className="text-xs font-bold text-black flex items-center gap-2 mt-1">
                      <Building2 className="h-3 w-3 shrink-0 text-black" />
                      Contrato {group.contractNumber}
                    </p>
                  )}
                </div>
                <Badge
                  variant={group.hasOverdue ? 'destructive' : 'default'}
                  className={`text-xs font-bold shrink-0 ${!group.hasOverdue ? 'bg-black text-white' : ''}`}
                >
                  {group.activeCount} {group.activeCount === 1 ? 'liberada' : 'liberadas'}
                </Badge>
              </div>

              <div className="mb-4">
                <Badge className="text-xs font-bold bg-neutral-700 text-white border-none">
                  {getWorkflowStatusLabel(group.workflowStatus)}
                </Badge>
              </div>

              {(() => {
                const step11 = group.allItems.find(i => i.step_order === 11);
                if (!step11 || step11.status !== 'completed' || !step11.completed_at) return null;
                const deadline = addBusinessDays(parseISO(step11.completed_at), 45);
                const remaining = differenceInBusinessDays(deadline, new Date());
                const isOverdue = remaining < 0;
                const isWarning = remaining >= 0 && remaining <= 5;
                const colorClass = isOverdue
                  ? 'bg-destructive/10 border-destructive text-destructive'
                  : isWarning
                    ? 'bg-amber-50 border-amber-400 text-amber-800'
                    : 'bg-emerald-50 border-emerald-400 text-emerald-800';
                const label = isOverdue
                  ? `${Math.abs(remaining)} du em atraso`
                  : remaining === 0
                    ? 'Vence hoje'
                    : `${remaining} du restantes`;
                return (
                  <div className={`mb-4 rounded-md border-l-4 ${colorClass} px-3 py-2.5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                          Prazo pós Caderno Técnico
                        </span>
                        <span className="text-[10px] font-medium opacity-60">
                          45 dias úteis · vence {format(deadline, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold whitespace-nowrap">{label}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2 mb-4">
                <Collapsible open={isExpanded} onOpenChange={() => toggle(group.projectId)}>
                  <CollapsibleTrigger className="w-full text-left text-xs font-bold text-card-foreground hover:underline flex items-center gap-1 mb-2">
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    {isExpanded ? 'Ocultar checklist completo' : `Ver checklist completo (${group.allItems.length} etapas)`}
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-1.5">
                    {group.allItems.map(item => {
                      const isUserItem = group.userItems.some(ui => ui.id === item.id);
                      const userItem = group.userItems.find(ui => ui.id === item.id);
                      const dueDateStatus = item.due_date ? getDueDateStatus(item.due_date) : null;

                      if (item.status === 'completed') {
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-2 bg-gray-100 border border-gray-200 rounded-lg opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4 text-gray-500 shrink-0" />
                            <span className="text-xs text-gray-600 truncate line-through">{item.name}</span>
                            <Badge variant="outline" className="text-[10px] font-medium ml-auto shrink-0 border-gray-300 text-gray-500 bg-gray-50">
                              Concluída
                            </Badge>
                          </div>
                        );
                      }

                      if (item.status === 'active') {
                        if (isUserItem && userItem) {
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                              onClick={() => onCompleteItem(userItem)}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                <span className="text-sm font-semibold text-black truncate">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {dueDateStatus && (
                                  <span className={`text-xs font-bold ${dueDateStatus.color}`}>{dueDateStatus.label}</span>
                                )}
                                <ChevronRight className="h-4 w-4 text-black/50" />
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="text-xs font-medium text-blue-800 truncate">{item.name}</span>
                            <Badge variant="outline" className="text-[10px] font-bold ml-auto shrink-0 border-blue-300 text-blue-700 bg-blue-100">
                              Outra área
                            </Badge>
                          </div>
                        );
                      }

                      if (isUserItem) {
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg"
                          >
                            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="text-xs font-bold text-black truncate">{item.name}</span>
                            <Badge variant="outline" className="text-[10px] font-bold ml-auto shrink-0 border-amber-400 text-black bg-amber-100">
                              Etapa {item.step_order}
                            </Badge>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg opacity-50"
                        >
                          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-500 truncate">{item.name}</span>
                          <Badge variant="outline" className="text-[10px] font-medium ml-auto shrink-0 border-gray-300 text-gray-400 bg-gray-100">
                            Etapa {item.step_order}
                          </Badge>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>

                {!isExpanded && (
                  <>
                    {group.userItems.filter(i => i.status === 'active').map(item => {
                      const dueDateStatus = getDueDateStatus(item.due_date);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                          onClick={() => onCompleteItem(item)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                            <span className="text-sm font-semibold text-black truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-bold ${dueDateStatus.color}`}>{dueDateStatus.label}</span>
                            <ChevronRight className="h-4 w-4 text-black/50" />
                          </div>
                        </div>
                      );
                    })}

                    {group.blockedCount > 0 && (
                      <div className="flex items-center gap-2 text-xs font-bold text-black mt-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span>
                          {group.blockedCount} {group.blockedCount === 1 ? 'etapa aguardando' : 'etapas aguardando'}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}