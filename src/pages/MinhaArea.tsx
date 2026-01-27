import { useState, useMemo } from 'react';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  User, 
  Building2,
  ChevronRight,
  ListChecks,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useUserAreas } from '@/hooks/useUserAreas';
import { usePositions } from '@/hooks/usePositions';
import { 
  useMyAllChecklistItems, 
  getResponsibleAreaLabel,
  getWorkflowStatusLabel,
  ChecklistItemWithDetails
} from '@/hooks/useChecklist';
import { CompleteActivityModal } from '@/components/minha-area/CompleteActivityModal';

interface ContractGroup {
  projectId: string;
  projectName: string;
  clientName: string | null;
  foccoNumber: string | null;
  workflowStatus: string;
  items: ChecklistItemWithDetails[];
  activeCount: number;
  blockedCount: number;
  hasOverdue: boolean;
}

export default function MinhaArea() {
  const { user } = useAuthContext();
  const { data: currentTeamMember, isLoading: isLoadingMember } = useCurrentTeamMember();
  const { areas: userFunctionalAreas, isLoading: isLoadingAreas } = useUserAreas(user?.id || null);
  const { getMemberAreaIds, getAreaName } = usePositions();
  
  const [selectedItem, setSelectedItem] = useState<ChecklistItemWithDetails | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());

  // Get user's areas from positions
  const userAreaNames = useMemo(() => {
    if (!currentTeamMember?.id) return [];
    const areaIds = getMemberAreaIds(currentTeamMember.id);
    return areaIds.map(id => getAreaName(id)).filter(Boolean);
  }, [currentTeamMember?.id, getMemberAreaIds, getAreaName]);

  // Combine functional areas with position areas for filtering
  const allUserAreas = useMemo(() => {
    const areas = new Set<string>();
    
    // Add functional areas
    userFunctionalAreas.forEach(area => areas.add(area));
    
    // Add position-based areas (map to functional area names)
    userAreaNames.forEach(name => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('comercial')) areas.add('comercial');
      if (lowerName.includes('projeto')) areas.add('projetos');
      if (lowerName.includes('customer') || lowerName.includes('success') || lowerName.includes('cs')) {
        areas.add('customer_success');
      }
      if (lowerName.includes('assist') || lowerName.includes('técnica') || lowerName.includes('logist')) {
        areas.add('assistencia_tecnica');
      }
    });
    
    return Array.from(areas);
  }, [userFunctionalAreas, userAreaNames]);

  const { data: allItems = [], isLoading: isLoadingItems } = useMyAllChecklistItems(
    allUserAreas, 
    currentTeamMember?.id
  );

  // Safety filter: enforce ownership rules client-side
  const visibleItems = useMemo(() => {
    const currentTeamMemberId = currentTeamMember?.id;

    return allItems.filter((item) => {
      const assignedTo = (item as any).assigned_to as string | null | undefined;
      const projectResponsibleId = (item as any).project?.responsible_id as string | null | undefined;
      const assignedProjetistaId = (item as any).checklist?.assigned_projetista_id as string | null | undefined;
      const assignedLogisticaId = (item as any).checklist?.assigned_logistica_id as string | null | undefined;
      const assignedCsId = (item as any).checklist?.assigned_cs_id as string | null | undefined;

      if (assignedTo) {
        return !!currentTeamMemberId && assignedTo === currentTeamMemberId;
      }

      if (item.responsible_area === 'comercial') {
        return !!currentTeamMemberId && !!projectResponsibleId && projectResponsibleId === currentTeamMemberId;
      }

      if (item.responsible_area === 'projetista_tecnico') {
        if (assignedProjetistaId) {
          return !!currentTeamMemberId && assignedProjetistaId === currentTeamMemberId;
        }
        return true;
      }

      if (item.responsible_area === 'logistica') {
        if (assignedLogisticaId) {
          return !!currentTeamMemberId && assignedLogisticaId === currentTeamMemberId;
        }
        return true;
      }

      if (item.responsible_area === 'cs') {
        if (assignedCsId) {
          return !!currentTeamMemberId && assignedCsId === currentTeamMemberId;
        }
        return true;
      }

      return true;
    });
  }, [allItems, currentTeamMember?.id]);

  // Group items by contract/project
  const contractGroups = useMemo(() => {
    const groups = new Map<string, ContractGroup>();

    visibleItems.forEach(item => {
      const projectId = item.project?.id || 'unknown';
      
      if (!groups.has(projectId)) {
        groups.set(projectId, {
          projectId,
          projectName: item.project?.name || 'Projeto sem nome',
          clientName: item.project?.clients?.name || null,
          foccoNumber: item.project?.focco_project_number || null,
          workflowStatus: item.checklist?.workflow_status || 'formalizacao',
          items: [],
          activeCount: 0,
          blockedCount: 0,
          hasOverdue: false,
        });
      }

      const group = groups.get(projectId)!;
      group.items.push(item);
      
      if (item.status === 'active') {
        group.activeCount++;
        if (item.due_date && isPast(parseISO(item.due_date)) && !isToday(parseISO(item.due_date))) {
          group.hasOverdue = true;
        }
      } else if (item.status === 'blocked') {
        group.blockedCount++;
      }
    });

    // Sort items within each group: active first (by due date), then blocked (by step order)
    groups.forEach(group => {
      group.items.sort((a, b) => {
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
    });

    // Sort groups: contracts with overdue items first, then by active count, then by name
    return Array.from(groups.values()).sort((a, b) => {
      if (a.hasOverdue && !b.hasOverdue) return -1;
      if (!a.hasOverdue && b.hasOverdue) return 1;
      if (a.activeCount !== b.activeCount) return b.activeCount - a.activeCount;
      return a.projectName.localeCompare(b.projectName);
    });
  }, [visibleItems]);

  // Stats
  const totalActive = visibleItems.filter(item => item.status === 'active').length;
  const totalBlocked = visibleItems.filter(item => item.status === 'blocked').length;
  const totalOverdue = visibleItems.filter(i => 
    i.status === 'active' && i.due_date && isPast(parseISO(i.due_date)) && !isToday(parseISO(i.due_date))
  ).length;
  const totalDueToday = visibleItems.filter(i => 
    i.status === 'active' && i.due_date && isToday(parseISO(i.due_date))
  ).length;

  const handleOpenCompleteModal = (item: ChecklistItemWithDetails) => {
    setSelectedItem(item);
    setCompleteModalOpen(true);
  };

  const handleCloseCompleteModal = () => {
    setSelectedItem(null);
    setCompleteModalOpen(false);
  };

  const toggleContract = (projectId: string) => {
    setExpandedContracts(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return { status: 'none', label: 'Sem prazo', color: 'text-muted-foreground' };
    
    const date = parseISO(dueDate);
    const daysUntil = differenceInDays(date, new Date());
    
    if (isPast(date) && !isToday(date)) {
      return { 
        status: 'overdue', 
        label: `Atrasado (${Math.abs(daysUntil)}d)`, 
        color: 'text-destructive' 
      };
    }
    if (isToday(date)) {
      return { status: 'today', label: 'Hoje', color: 'text-orange-600' };
    }
    if (daysUntil <= 2) {
      return { status: 'soon', label: `${daysUntil}d`, color: 'text-orange-500' };
    }
    return { 
      status: 'ok', 
      label: format(date, "dd/MM", { locale: ptBR }), 
      color: 'text-muted-foreground' 
    };
  };

  const isLoading = isLoadingMember || isLoadingAreas || isLoadingItems;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Carregando suas atividades...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-light tracking-tight">
            Olá, {currentTeamMember?.name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="text-muted-foreground">
            Suas atividades pendentes do workflow de contratos
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded">
                  <ListChecks className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalActive}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Ativas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalBlocked}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Aguardando
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalOverdue}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Atrasadas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalDueToday}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Vencem Hoje
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contract Groups */}
        <div className="space-y-4">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
            Meus Contratos ({contractGroups.length})
          </h2>

          {contractGroups.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Tudo em dia!</h3>
                <p className="text-muted-foreground text-sm">
                  Você não possui atividades pendentes no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractGroups.map((group) => {
                const isExpanded = expandedContracts.has(group.projectId);
                const progressPercentage = group.items.length > 0 
                  ? Math.round((group.items.filter(i => i.status === 'completed').length / 18) * 100)
                  : 0;

                return (
                  <Card 
                    key={group.projectId} 
                    className={`border-border ${group.hasOverdue ? 'border-l-4 border-l-destructive' : ''}`}
                  >
                    <CardContent className="p-4">
                      {/* Contract Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          {group.clientName && (
                            <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              {group.clientName}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {group.projectName}
                          </p>
                          {group.foccoNumber && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <FileText className="h-3 w-3 shrink-0" />
                              FOCCO {group.foccoNumber}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant={group.hasOverdue ? 'destructive' : 'secondary'} 
                          className="text-xs shrink-0"
                        >
                          {group.activeCount} {group.activeCount === 1 ? 'ativa' : 'ativas'}
                        </Badge>
                      </div>

                      {/* Workflow Status */}
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs bg-primary/5">
                          {getWorkflowStatusLabel(group.workflowStatus)}
                        </Badge>
                      </div>

                      {/* Activity Summary */}
                      <div className="space-y-2 mb-3">
                        {/* Active items preview */}
                        {group.items.filter(i => i.status === 'active').slice(0, 2).map((item) => {
                          const dueDateStatus = getDueDateStatus(item.due_date);
                          return (
                            <div 
                              key={item.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                              onClick={() => handleOpenCompleteModal(item)}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                <span className="text-sm truncate">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs ${dueDateStatus.color}`}>
                                  {dueDateStatus.label}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          );
                        })}

                        {/* Show blocked items count */}
                        {group.blockedCount > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{group.blockedCount} {group.blockedCount === 1 ? 'etapa aguardando' : 'etapas aguardando'}</span>
                          </div>
                        )}
                      </div>

                      {/* Expand/Collapse for blocked items */}
                      {group.blockedCount > 0 && (
                        <Collapsible open={isExpanded} onOpenChange={() => toggleContract(group.projectId)}>
                          <CollapsibleTrigger className="w-full text-left text-xs text-primary hover:underline flex items-center gap-1">
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded ? 'Ocultar próximas etapas' : 'Ver próximas etapas'}
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent className="mt-2 space-y-1">
                            {group.items.filter(i => i.status === 'blocked').map((item) => (
                              <div 
                                key={item.id}
                                className="flex items-center gap-2 p-2 bg-muted/30 rounded opacity-60"
                              >
                                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span className="text-xs truncate">{item.name}</span>
                                <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                                  Etapa {item.step_order}
                                </Badge>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Show remaining active items if more than 2 */}
                      {group.items.filter(i => i.status === 'active').length > 2 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{group.items.filter(i => i.status === 'active').length - 2} mais atividades ativas
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Complete Activity Modal */}
      <CompleteActivityModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        item={selectedItem}
        onClose={handleCloseCompleteModal}
      />
    </Layout>
  );
}
