import { useState, useMemo } from 'react';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  User, 
  Building2,
  ChevronRight,
  ListChecks,
  Loader2,
  ChevronDown,
  Users,
  BarChart3
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useUserAreas } from '@/hooks/useUserAreas';
import { usePositions } from '@/hooks/usePositions';
import { 
  useMyAllChecklistItems,
  useAllProjectChecklistItems,
  useAllTeamChecklistItems,
  getWorkflowStatusLabel,
  ChecklistItemWithDetails
} from '@/hooks/useChecklist';
import { CompleteActivityModal } from '@/components/minha-area/CompleteActivityModal';
import { ProjetistaSection } from '@/components/minha-area/ProjetistaSection';
import { ProjetistaTecnicoProjects } from '@/components/minha-area/ProjetistaTecnicoProjects';
import { ManagementDashboard } from '@/components/minha-area/ManagementDashboard';
import { StaleProjectsBanner } from '@/components/minha-area/StaleProjectsBanner';
import { useTeamMembers } from '@/hooks/useDatabase';

interface ChecklistItemFull {
  id: string;
  step_order: number;
  name: string;
  status: string;
  responsible_area: string;
  due_date: string | null;
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

interface ContractGroup {
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

export default function MinhaArea() {
  const { user, isAdmin } = useAuthContext();
  const { data: currentTeamMember, isLoading: isLoadingMember } = useCurrentTeamMember();
  const { areas: userFunctionalAreas, isLoading: isLoadingAreas } = useUserAreas(user?.id || null);
  const { getMemberAreaIds, getAreaName, getMemberPositions } = usePositions();
  const { data: allTeamMembersData = [] } = useTeamMembers();
  
  const [selectedItem, setSelectedItem] = useState<ChecklistItemWithDetails | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');
  const [activeTab, setActiveTab] = useState<'activities' | 'indicators'>('activities');
  const [teamFilterMemberId, setTeamFilterMemberId] = useState<string>('');

  // Check if user has management position (Gerencia or Gerente)
  const isManagement = useMemo(() => {
    if (!currentTeamMember?.id) return false;
    const memberPositions = getMemberPositions(currentTeamMember.id);
    return memberPositions.some(p => 
      p.name.toLowerCase().includes('gerencia') || 
      p.name.toLowerCase().includes('gerente')
    );
  }, [currentTeamMember?.id, getMemberPositions]);

  // Check if user is a Projetista Técnico
  const isProjetistaTecnico = useMemo(() => {
    if (!currentTeamMember?.id) return false;
    const memberPositions = getMemberPositions(currentTeamMember.id);
    return memberPositions.some(p => 
      p.name.toLowerCase().includes('projetista técnico') || 
      p.name.toLowerCase().includes('projetista tecnico')
    );
  }, [currentTeamMember?.id, getMemberPositions]);

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

  // User's own checklist items
  const { data: myItems = [], isLoading: isLoadingMyItems } = useMyAllChecklistItems(
    allUserAreas, 
    currentTeamMember?.id
  );

  // Admin: All team checklist items
  const { data: allTeamItems = [], isLoading: isLoadingTeamItems } = useAllTeamChecklistItems(isAdmin && viewMode === 'team');

  // Decide which items to use based on viewMode
  const allItems = viewMode === 'team' && isAdmin ? allTeamItems : myItems;
  const isLoadingItems = viewMode === 'team' && isAdmin ? isLoadingTeamItems : isLoadingMyItems;

  // Get unique project IDs from items
  const projectIds = useMemo(() => {
    const ids = new Set<string>();
    allItems.forEach(item => {
      const projectId = item.project?.id || (item as any).checklist?.project_id;
      if (projectId) ids.add(projectId);
    });
    return Array.from(ids);
  }, [allItems]);

  // Fetch ALL checklist items for these projects (all areas, all statuses)
  const { data: allProjectItems = [] } = useAllProjectChecklistItems(projectIds);

  // Safety filter: enforce ownership rules client-side (only for user's own items)
  // For admin team view, show all items without filtering
  const visibleItems = useMemo(() => {
    // Admin viewing team - show all items
    if (isAdmin && viewMode === 'team') {
      return allItems;
    }

    // Regular user or admin viewing their own items
    const currentTeamMemberId = currentTeamMember?.id;
    
    // CRITICAL: If user is not linked to a team_member, they cannot see any items
    if (!currentTeamMemberId) {
      console.warn('No currentTeamMemberId in visibleItems - user not linked to team_member');
      return [];
    }

    return allItems.filter((item) => {
      const assignedTo = (item as any).assigned_to as string | null | undefined;
      const projectResponsibleId = (item as any).project?.responsible_id as string | null | undefined;
      const assignedProjetistaId = (item as any).checklist?.assigned_projetista_id as string | null | undefined;
      const assignedLogisticaId = (item as any).checklist?.assigned_logistica_id as string | null | undefined;
      const assignedCsId = (item as any).checklist?.assigned_cs_id as string | null | undefined;

      // If item has a specific assigned_to, only show to that person
      if (assignedTo) {
        return assignedTo === currentTeamMemberId;
      }

      if (item.responsible_area === 'comercial') {
        return !!projectResponsibleId && projectResponsibleId === currentTeamMemberId;
      }

      if (item.responsible_area === 'projetista_tecnico') {
        return !!assignedProjetistaId && assignedProjetistaId === currentTeamMemberId;
      }

      if (item.responsible_area === 'logistica') {
        return !!assignedLogisticaId && assignedLogisticaId === currentTeamMemberId;
      }

      if (item.responsible_area === 'cs') {
        return !!assignedCsId && assignedCsId === currentTeamMemberId;
      }

      // CRITICAL: If no condition matched, user should NOT see this item
      return false;
    });
  }, [allItems, currentTeamMember?.id, isAdmin, viewMode]);

  // Active team members for filter dropdown
  const activeTeamMembers = useMemo(() => {
    return allTeamMembersData
      .filter((m: any) => m.active)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [allTeamMembersData]);

  // Group items by contract/project
  const contractGroups = useMemo(() => {
    const groups = new Map<string, ContractGroup>();

    // Determine which items to group - apply team member filter if active
    const itemsToGroup = (viewMode === 'team' && isAdmin && teamFilterMemberId)
      ? visibleItems.filter(item => {
          const responsibleId = (item as any).project?.responsible_id;
          const assignedProjetistaId = (item as any).checklist?.assigned_projetista_id;
          const assignedLogisticaId = (item as any).checklist?.assigned_logistica_id;
          const assignedCsId = (item as any).checklist?.assigned_cs_id;
          const assignedTo = (item as any).assigned_to;
          
          return responsibleId === teamFilterMemberId ||
            assignedProjetistaId === teamFilterMemberId ||
            assignedLogisticaId === teamFilterMemberId ||
            assignedCsId === teamFilterMemberId ||
            assignedTo === teamFilterMemberId;
        })
      : visibleItems;

    // First, add all user's visible items
    itemsToGroup.forEach(item => {
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

    // Add ALL checklist items for each project (from allProjectItems)
    allProjectItems.forEach((item: ChecklistItemFull) => {
      const projectId = item.checklist?.project_id;
      if (projectId && groups.has(projectId)) {
        groups.get(projectId)!.allItems.push(item);
      }
    });

    // Sort allItems by step_order
    groups.forEach(group => {
      group.allItems.sort((a, b) => a.step_order - b.step_order);
      // Sort user items: active first (by due date)
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
      // Count completed
      group.completedCount = group.allItems.filter(i => i.status === 'completed').length;
    });

    // Sort groups: contracts with overdue items first, then by active count, then by name
    return Array.from(groups.values()).sort((a, b) => {
      if (a.hasOverdue && !b.hasOverdue) return -1;
      if (!a.hasOverdue && b.hasOverdue) return 1;
      if (a.activeCount !== b.activeCount) return b.activeCount - a.activeCount;
      return a.projectName.localeCompare(b.projectName);
    });
  }, [visibleItems, allProjectItems, viewMode, isAdmin, teamFilterMemberId]);

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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-light tracking-tight">
              {activeTab === 'indicators' 
                ? 'Indicadores de Resultados'
                : viewMode === 'team' 
                  ? 'Visão Geral da Equipe' 
                  : `Olá, ${currentTeamMember?.name?.split(' ')[0] || 'Usuário'}`}
            </h1>
            
            {/* Admin/Manager View Toggle - only show when on activities tab */}
            {isAdmin && activeTab === 'activities' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('my')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'my' 
                      ? 'bg-black text-white' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <User className="h-3 w-3 inline mr-1" />
                  Minhas Atividades
                </button>
                <button
                  onClick={() => setViewMode('team')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'team' 
                      ? 'bg-black text-white' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Users className="h-3 w-3 inline mr-1" />
                  Toda Equipe
                </button>
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            {activeTab === 'indicators'
              ? 'Acompanhe a evolução mês a mês por colaborador e área em relação às metas'
              : viewMode === 'team' 
                ? 'Acompanhe o andamento de todos os contratos e checklists da equipe'
                : 'Atividades liberadas para sua execução e aguardando liberação de outras áreas'}
          </p>
        </div>

        {/* Main Tab Navigation for Managers/Admins */}
        {(isManagement || isAdmin) ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'activities' | 'indicators')}>
            <TabsList className="mb-4">
              <TabsTrigger value="activities" className="flex items-center gap-1.5">
                <ListChecks className="h-4 w-4" />
                Atividades
              </TabsTrigger>
              <TabsTrigger value="indicators" className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Indicadores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="space-y-6 mt-0">
              {/* Activities Content */}
              {renderActivitiesContent()}
            </TabsContent>

            <TabsContent value="indicators" className="mt-0">
              <ManagementDashboard />
            </TabsContent>
          </Tabs>
        ) : (
          /* Regular users see activities only */
          renderActivitiesContent()
        )}
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

  // Helper function to render activities content
  function renderActivitiesContent() {
    return (
      <>
        {/* Team Member Filter - only in team view */}
        {viewMode === 'team' && isAdmin && (
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <select
              value={teamFilterMemberId}
              onChange={(e) => setTeamFilterMemberId(e.target.value)}
              className="input-flat text-sm max-w-xs"
            >
              <option value="">Todos os colaboradores</option>
              {activeTeamMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {teamFilterMemberId && (
              <button
                onClick={() => setTeamFilterMemberId('')}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Limpar
              </button>
            )}
          </div>
        )}

        {/* Stale Projects Banner - Atualização Importante (only personal view) */}
        {viewMode === 'my' && currentTeamMember?.id && (
          <StaleProjectsBanner teamMemberId={currentTeamMember.id} />
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded">
                  <ListChecks className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalActive}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Liberadas
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
        </div>

        {/* Projetista Section - shows project production stats if applicable (only in personal view) */}
        {viewMode === 'my' && currentTeamMember?.id && (
          <ProjetistaSection 
            teamMemberId={currentTeamMember.id} 
            teamMemberName={currentTeamMember.name} 
          />
        )}

        {/* Projetista Técnico Projects - show project cards for assigned technical projects */}
        {viewMode === 'my' && currentTeamMember?.id && isProjetistaTecnico && (
          <ProjetistaTecnicoProjects teamMemberId={currentTeamMember.id} />
        )}

        {/* Contract Groups */}
        <div className="space-y-4">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
            {viewMode === 'team' ? 'Contratos da Equipe' : 'Meus Contratos'} ({contractGroups.length})
          </h2>

          {contractGroups.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium mb-2">
                  {viewMode === 'team' ? 'Nenhum contrato ativo' : 'Tudo em dia!'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {viewMode === 'team' 
                    ? 'Não há contratos com atividades pendentes no momento.'
                    : 'Você não possui atividades pendentes no momento.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractGroups.map((group) => {
                const isExpanded = expandedContracts.has(group.projectId);

                return (
                  <Card 
                    key={group.projectId} 
                    className={`border-2 border-black/10 shadow-md ${group.hasOverdue ? 'border-l-4 border-l-destructive' : ''}`}
                  >
                    <CardContent className="p-5">
                      {/* Contract Header - Cliente, FOCCO, Contrato */}
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

                      {/* Workflow Status */}
                      <div className="mb-4">
                        <Badge className="text-xs font-bold bg-neutral-700 text-white border-none">
                          {getWorkflowStatusLabel(group.workflowStatus)}
                        </Badge>
                      </div>

                      {/* All Checklist Items */}
                      <div className="space-y-2 mb-4">
                        <Collapsible open={isExpanded} onOpenChange={() => toggleContract(group.projectId)}>
                          <CollapsibleTrigger className="w-full text-left text-xs font-bold text-card-foreground hover:underline flex items-center gap-1 mb-2">
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded ? 'Ocultar checklist completo' : `Ver checklist completo (${group.allItems.length} etapas)`}
                          </CollapsibleTrigger>

                          <CollapsibleContent className="space-y-1.5">
                            {group.allItems.map((item) => {
                              // Check if this item belongs to the current user
                              const isUserItem = group.userItems.some(ui => ui.id === item.id);
                              const userItem = group.userItems.find(ui => ui.id === item.id);
                              const dueDateStatus = item.due_date ? getDueDateStatus(item.due_date) : null;
                              
                              // Completed items
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
                              
                              // Active items - check if it's the user's turn
                              if (item.status === 'active') {
                                if (isUserItem && userItem) {
                                  return (
                                    <div 
                                      key={item.id}
                                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                                      onClick={() => handleOpenCompleteModal(userItem)}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                        <span className="text-sm font-semibold text-black truncate">{item.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {dueDateStatus && (
                                          <span className={`text-xs font-bold ${dueDateStatus.color}`}>
                                            {dueDateStatus.label}
                                          </span>
                                        )}
                                        <ChevronRight className="h-4 w-4 text-black/50" />
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Active but not user's area - show as waiting for other area
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
                              }
                              
                              // Blocked items
                              if (isUserItem) {
                                // User's blocked item - waiting for previous step
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
                              } else {
                                // Other area's blocked item
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
                              }
                            })}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Quick summary when collapsed */}
                        {!isExpanded && (
                          <>
                            {/* Show user's active items */}
                            {group.userItems.filter(i => i.status === 'active').map((item) => {
                              const dueDateStatus = getDueDateStatus(item.due_date);
                              return (
                                <div 
                                  key={item.id}
                                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                                  onClick={() => handleOpenCompleteModal(item)}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                    <span className="text-sm font-semibold text-black truncate">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs font-bold ${dueDateStatus.color}`}>
                                      {dueDateStatus.label}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-black/50" />
                                  </div>
                                </div>
                              );
                            })}

                            {/* Show blocked count */}
                            {group.blockedCount > 0 && (
                              <div className="flex items-center gap-2 text-xs font-bold text-black mt-2">
                                <Clock className="h-4 w-4 text-amber-600" />
                                <span>{group.blockedCount} {group.blockedCount === 1 ? 'etapa aguardando' : 'etapas aguardando'}</span>
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
          )}
        </div>
      </>
    );
  }
}
