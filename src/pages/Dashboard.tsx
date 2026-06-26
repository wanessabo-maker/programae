import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { usePositions } from '@/hooks/usePositions';
import { useMonthlyEnvironmentStats } from '@/hooks/useProjectEnvironments';
import { MetricCard } from '@/components/MetricCard';
import { ActionModal } from '@/components/ActionModal';
import { EditActionModal } from '@/components/EditActionModal';
import { YearlyResultsBoard } from '@/components/YearlyResultsBoard';
import { DeleteActionConfirmDialog } from '@/components/DeleteActionConfirmDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DashboardSkeleton, 
  LoadingTimeoutMessage,
  MetricCardSkeleton 
} from '@/components/dashboard/DashboardSkeletons';
import { format, parseISO, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Action } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CleanlinessCheckBar } from '@/components/dashboard/CleanlinessCheckBar';
import { PlannerTab } from '@/components/comercial/PlannerTab';
import { useEngenhariaMembers } from '@/hooks/useEngenhariaMembers';

export default function Dashboard() {
  // State hooks first
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const [actionsFilter, setActionsFilter] = useState<string>('all');
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const [actionsMonthOffset, setActionsMonthOffset] = useState(0); // 0 = current month, -1 = last month, etc.
  
  // Context hooks
  const { isAdmin } = useAuthContext();
  const { 
    actions, 
    creditTransactions,
    metas, 
    areas, 
    teamMembers, 
    actionTypes, 
    professionals,
    professionalCategories,
    deleteAction,
    isLoading 
  } = useApp();
  
  // Query hooks (that depend on context)
  const { data: currentTeamMember, isLoading: isCurrentTeamMemberLoading } = useCurrentTeamMember();
  const { getMemberAreaIds, getAreaName } = usePositions();
  
  // Get current month environment stats for project goals
  const currentDate = new Date();
  const { data: envStats } = useMonthlyEnvironmentStats(currentDate.getFullYear(), currentDate.getMonth() + 1);

  // Engenharia members (Consultor Comercial Engenharia) — usado para separar vendas/metas
  const { engOnlyMemberIds, isEngenhariaConsultant } = useEngenhariaMembers();

  // Map action_id -> latest presented_value (used for "Apresentação de Projeto")
  const { data: actionPresentedValueMap = {} } = useQuery<Record<string, number>>({
    queryKey: ['dashboard-action-presented-values'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_value_history')
        .select('action_id, presented_value, created_at')
        .not('action_id', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((row) => {
        if (row.action_id && map[row.action_id] === undefined) {
          map[row.action_id] = Number(row.presented_value) || 0;
        }
      });
      return map;
    },
  });

  // Show timeout message after 3 seconds if still loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowTimeoutMessage(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTimeoutMessage(false);
    }
  }, [isLoading]);

  const activeMembers = teamMembers.filter(m => m.active);

  // Filter only active metas (within validity period)
  const activeMetas = useMemo(() => {
    const today = new Date();
    return metas.filter(m => {
      if (!m.isActive) return false;
      if (m.endDate && new Date(m.endDate) < today) return false;
      if (m.startDate && new Date(m.startDate) > today) return false;
      return true;
    });
  }, [metas]);

  // Calculate monthly metrics
  const monthlyMetrics = useMemo(() => {
    const thisMonthActions = actions.filter(a => isThisMonth(parseISO(a.date)));
    
    const totalSales = thisMonthActions
      .filter(a => {
        const type = actionTypes.find(t => t.id === a.actionTypeId);
        return type?.classification === 'venda'
          && !isEngenhariaConsultant(a.consultantId, a.salesChannel ?? null);
      })
      .reduce((sum, a) => sum + (a.value || 0), 0);

    const totalCaptacoes = thisMonthActions.filter(a => {
      const type = actionTypes.find(t => t.id === a.actionTypeId);
      return type?.impactsMetas.includes('captacao');
    }).length;

    // Get members who have individual 'acoes' goals
    const membersWithIndividualAcoesMeta = activeMetas
      .filter(m => m.type === 'acoes' && m.teamMemberId)
      .map(m => m.teamMemberId);

    // Get areas that have area-level 'acoes' goals (for fallback)
    const areasWithAcoesMeta = activeMetas
      .filter(m => m.type === 'acoes' && !m.teamMemberId)
      .map(m => m.areaId);

    // Get active members whose areas have 'acoes' goals (checking position-based areas too)
    const membersWithAcoesMeta = activeMembers
      .filter(m => {
        // First check if member has individual goal
        if (membersWithIndividualAcoesMeta.includes(m.id)) return true;
        // Then check area-level goals using position-based areas
        const memberAreaIds = getMemberAreaIds(m.id);
        const hasPositionAreaWithMeta = memberAreaIds.some(areaId => areasWithAcoesMeta.includes(areaId));
        // Also check legacy areaId as fallback
        return hasPositionAreaWithMeta || areasWithAcoesMeta.includes(m.areaId);
      })
      .map(m => m.id);

    // Count only actions from consultants with 'acoes' goals
    const totalAcoes = thisMonthActions.filter(a => 
      membersWithAcoesMeta.includes(a.consultantId)
    ).length;

    // Get active metas only — Geral exclui canal Engenharia
    const salesMeta = activeMetas
      .filter(m => m.type === 'vendas' && !(
        m.salesChannel === 'engenharia' ||
        (!m.salesChannel && !!m.teamMemberId && engOnlyMemberIds.has(m.teamMemberId))
      ))
      .reduce((sum, m) => sum + m.value, 0);
    const captacaoMeta = activeMetas.filter(m => m.type === 'captacao').reduce((sum, m) => sum + m.value, 0);
    const acoesMeta = activeMetas.filter(m => m.type === 'acoes').reduce((sum, m) => sum + m.value, 0);

    return {
      sales: { value: totalSales, meta: salesMeta, percentage: salesMeta > 0 ? (totalSales / salesMeta) * 100 : 0 },
      captacoes: { value: totalCaptacoes, meta: captacaoMeta, percentage: captacaoMeta > 0 ? (totalCaptacoes / captacaoMeta) * 100 : 0 },
      acoes: { value: totalAcoes, meta: acoesMeta, percentage: acoesMeta > 0 ? (totalAcoes / acoesMeta) * 100 : 0 },
    };
  }, [actions, activeMetas, actionTypes, activeMembers, isEngenhariaConsultant, engOnlyMemberIds, getMemberAreaIds]);

  // Métrica do canal Engenharia (Valor Vendido + Meta) — somente colaboradores no cargo "Consultor Comercial Engenharia"
  const engenhariaMetric = useMemo(() => {
    const thisMonthActions = actions.filter(a => isThisMonth(parseISO(a.date)));
    const totalSalesEng = thisMonthActions
      .filter(a => {
        const type = actionTypes.find(t => t.id === a.actionTypeId);
        return type?.classification === 'venda'
          && isEngenhariaConsultant(a.consultantId, a.salesChannel ?? null);
      })
      .reduce((sum, a) => sum + (a.value || 0), 0);
    const salesMetaEng = activeMetas
      .filter(m => m.type === 'vendas' && (
        m.salesChannel === 'engenharia' ||
        (!m.salesChannel && !!m.teamMemberId && engOnlyMemberIds.has(m.teamMemberId))
      ))
      .reduce((sum, m) => sum + m.value, 0);
    return {
      value: totalSalesEng,
      meta: salesMetaEng,
      percentage: salesMetaEng > 0 ? (totalSalesEng / salesMetaEng) * 100 : 0,
    };
  }, [actions, actionTypes, activeMetas, engOnlyMemberIds, isEngenhariaConsultant]);

  // Metrics by consultant
  // ID da área de Projetos para lógica especial de ambientes
  const PROJETOS_AREA_ID = 'aad0d175-cabd-490d-ae7d-53b97dc8edc4';

  const consultantMetrics = useMemo(() => {
    return activeMembers.map(member => {
      // Use position-based areas, fallback to legacy areaId
      const memberAreaIds = getMemberAreaIds(member.id);
      const primaryAreaId = memberAreaIds[0] || member.areaId;
      const primaryAreaName = primaryAreaId ? getAreaName(primaryAreaId) : '';
      
      // Check if member is from Projects area
      const isProjectsArea = memberAreaIds.includes(PROJETOS_AREA_ID) || primaryAreaId === PROJETOS_AREA_ID;
      
      const thisMonthActions = actions.filter(a => 
        a.consultantId === member.id && isThisMonth(parseISO(a.date))
      );
      
      const totalSales = thisMonthActions
        .filter(a => {
          const type = actionTypes.find(t => t.id === a.actionTypeId);
          return type?.classification === 'venda';
        })
        .reduce((sum, a) => sum + (a.value || 0), 0);

      const totalAcoes = thisMonthActions.length;

      // Get member's professionals by category
      const memberProfessionals = professionals.filter(p => p.consultantId === member.id);
      
      // Define the order for categories (ENCANTADO, CURIOSO, DISTANTE)
      const categoryOrder = ['ENCANTADO', 'CURIOSO', 'DISTANTE'];
      
      const categoryBreakdown = professionalCategories
        .map(cat => ({
          name: cat.name,
          count: memberProfessionals.filter(p => p.categoryId === cat.id).length,
        }))
        .sort((a, b) => {
          const aIndex = categoryOrder.indexOf(a.name.toUpperCase());
          const bIndex = categoryOrder.indexOf(b.name.toUpperCase());
          // If both are in the order list, sort by their position
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          // If only a is in the list, it comes first
          if (aIndex !== -1) return -1;
          // If only b is in the list, it comes first
          if (bIndex !== -1) return 1;
          // Otherwise, keep original order
          return 0;
        });

      // Get all ACTIVE metas for this member (individual goals) or area fallback
      const memberMetas = activeMetas.filter(m => m.teamMemberId === member.id);
      const areaMetas = memberMetas.length > 0 ? memberMetas : activeMetas.filter(m => m.areaId === member.areaId && !m.teamMemberId);
      
      // Build metrics only for goals that exist for this member
      const metricsForArea: Array<{
        type: string;
        label: string;
        value: number | string;
        meta: number;
        percentage: number;
        isCurrency?: boolean;
        isCategory?: boolean;
        isPrimary?: boolean;
        order?: number;
        onTarget?: boolean;
        isMaxLimit?: boolean;
        metaLabelPrefix?: string;
        metaDisplayValue?: number;
      }> = [];

      // Build metrics only for goals that exist AND have value > 1
      // Use individual meta value directly (no division by team members)
      // Deduplicate category metas by categoryId to avoid duplicate % rows in the dashboard
      const seenCategoryIds = new Set<string>();
      const uniqueAreaMetas = areaMetas.filter(meta => {
        if (meta.value <= 1) return false;
        if (meta.type === 'categoria' && meta.categoryId) {
          if (seenCategoryIds.has(meta.categoryId)) return false;
          seenCategoryIds.add(meta.categoryId);
        }
        return true;
      });

      uniqueAreaMetas.forEach(meta => {
        const individualMeta = meta.value; // Direct value - no more division
        
        if (meta.type === 'vendas') {
          const percentage = individualMeta > 0 ? (totalSales / individualMeta) * 100 : 0;
          metricsForArea.push({
            type: 'vendas',
            label: 'VENDAS',
            value: totalSales,
            meta: individualMeta,
            percentage,
            isCurrency: true,
            isPrimary: true,
            order: 1,
            onTarget: totalSales >= individualMeta,
          });
        } else if (meta.type === 'captacao') {
          const totalCaptacoes = thisMonthActions.filter(a => {
            const type = actionTypes.find(t => t.id === a.actionTypeId);
            return type?.impactsMetas.includes('captacao');
          }).length;
          const percentage = individualMeta > 0 ? (totalCaptacoes / individualMeta) * 100 : 0;
          metricsForArea.push({
            type: 'captacao',
            label: 'CAPTAÇÃO',
            value: totalCaptacoes,
            meta: individualMeta,
            percentage,
            isPrimary: true,
            order: 2,
            onTarget: totalCaptacoes >= individualMeta,
          });
        } else if (meta.type === 'acoes') {
          const percentage = individualMeta > 0 ? (totalAcoes / individualMeta) * 100 : 0;
          metricsForArea.push({
            type: 'acoes',
            label: 'AÇÕES',
            value: totalAcoes,
            meta: individualMeta,
            percentage,
            isPrimary: true,
            order: 3,
            onTarget: totalAcoes >= individualMeta,
          });
        } else if (meta.type === 'projeto') {
          // Projetos: usar contagem de AMBIENTES (não ações)
          // Buscar ambientes do projetista na tabela project_environments
          const memberEnvStats = envStats?.byProjetista?.[member.id];
          const totalAmbientes = memberEnvStats 
            ? (memberEnvStats.apresentacao || 0) + (memberEnvStats.tecnico || 0)
            : 0;
          const percentage = individualMeta > 0 ? (totalAmbientes / individualMeta) * 100 : 0;
          metricsForArea.push({
            type: 'projeto',
            label: 'AMBIENTES',
            value: totalAmbientes,
            meta: individualMeta,
            percentage,
            isPrimary: false,
            order: 4,
            onTarget: totalAmbientes >= individualMeta,
          });
        } else if (meta.type === 'categoria' && meta.categoryId) {
          // Calculate percentage of professionals in the specified category
          const categoryCount = memberProfessionals.filter(p => p.categoryId === meta.categoryId).length;
          const pct = memberProfessionals.length > 0 
            ? (categoryCount / memberProfessionals.length) * 100 
            : 0;
          const category = professionalCategories.find(c => c.id === meta.categoryId);
          const catName = (category?.name || '').toUpperCase();
          // Fixed sequence: ENCANTADO → CURIOSO → DISTANTE
          let categoryOrder = 10;
          if (catName.includes('ENCANT')) categoryOrder = 10;
          else if (catName.includes('CURIOS')) categoryOrder = 11;
          else if (catName.includes('DISTANT')) categoryOrder = 12;

          const hasMin = category?.minPercentage !== undefined && category.minPercentage > 0;
          const hasMax = category?.maxPercentage !== undefined && category.maxPercentage > 0;
          let effectiveMeta = individualMeta;
          let isMaxLimit = false;
          let onTarget: boolean;
          let barPercentage = 0;
          let metaLabelPrefix = 'mais que';
          let metaDisplayValue = individualMeta;

          if (hasMin && hasMax) {
            effectiveMeta = category.maxPercentage;
            isMaxLimit = true;
            onTarget = pct >= category.minPercentage && pct <= category.maxPercentage;
            barPercentage = category.maxPercentage > 0 ? (pct / category.maxPercentage) * 100 : 0;
            metaLabelPrefix = 'mais que';
            metaDisplayValue = category.minPercentage;
          } else if (hasMin) {
            effectiveMeta = category.minPercentage;
            onTarget = pct >= effectiveMeta;
            barPercentage = effectiveMeta > 0 ? (pct / effectiveMeta) * 100 : 0;
            metaLabelPrefix = 'mais que';
            metaDisplayValue = category.minPercentage;
          } else if (hasMax) {
            effectiveMeta = category.maxPercentage;
            isMaxLimit = true;
            onTarget = pct <= effectiveMeta;
            barPercentage = effectiveMeta > 0 ? (pct / effectiveMeta) * 100 : 0;
            metaLabelPrefix = 'menos que';
            metaDisplayValue = category.maxPercentage;
          } else {
            onTarget = pct >= effectiveMeta;
            barPercentage = effectiveMeta > 0 ? (pct / effectiveMeta) * 100 : 0;
            metaLabelPrefix = 'mais que';
            metaDisplayValue = individualMeta;
          }

          metricsForArea.push({
            type: `categoria-${meta.categoryId}`, // Unique key per category
            label: `% ${category?.name?.toUpperCase() || 'CATEGORIA'}`,
            value: `${pct.toFixed(0)}%`,
            meta: effectiveMeta,
            percentage: barPercentage,
            isCategory: true,
            isPrimary: false,
            order: categoryOrder,
            onTarget,
            isMaxLimit,
            metaLabelPrefix,
            metaDisplayValue,
          });
        }
      });
      
      // Sort metrics by order
      metricsForArea.sort((a, b) => (a.order || 99) - (b.order || 99));

      // Check if consultant has any goals > 1 or performed actions this month
      const hasGoals = metricsForArea.length > 0;
      
      // For Projects area, use environment count instead of action count
      const memberEnvStats = envStats?.byProjetista?.[member.id];
      const totalMemberAmbientes = memberEnvStats 
        ? (memberEnvStats.apresentacao || 0) + (memberEnvStats.tecnico || 0)
        : 0;
      
      // Activity count: for Projects area use environments, otherwise use actions
      const hasActions = isProjectsArea ? totalMemberAmbientes > 0 : thisMonthActions.length > 0;
      const actionCount = isProjectsArea ? totalMemberAmbientes : thisMonthActions.length;

      // RULE: Display consultant if they have actions OR goals
      // Actions take priority - never hide a consultant who has generated actions
      const shouldDisplay = hasActions || hasGoals;

      return {
        ...member,
        areaId: primaryAreaId,
        area: primaryAreaName,
        metricsForArea,
        categoryBreakdown,
        totalProfessionals: memberProfessionals.length,
        hasGoals,
        hasActions,
        actionCount,
        shouldDisplay,
        isProjectsArea,
      };
    });
  }, [activeMembers, actions, metas, actionTypes, professionals, professionalCategories, getMemberAreaIds, getAreaName, envStats]);

  // Group consultants by area (only those that should be displayed)
  const consultantsByArea = useMemo(() => {
    const filtered = consultantMetrics.filter(c => c.shouldDisplay);
    const grouped: Record<string, typeof filtered> = {};
    
    filtered.forEach(consultant => {
      const areaName = consultant.area || 'Sem Área';
      if (!grouped[areaName]) {
        grouped[areaName] = [];
      }
      grouped[areaName].push(consultant);
    });
    
    return grouped;
  }, [consultantMetrics]);

  // Selected month for actions view
  const selectedActionsDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + actionsMonthOffset);
    return d;
  }, [actionsMonthOffset]);

  const selectedActionsMonthLabel = format(selectedActionsDate, "MMMM 'de' yyyy", { locale: ptBR });

  

  // Actions for the selected month with optional team member filter
  const currentMonthActions = useMemo(() => {
    const targetYear = selectedActionsDate.getFullYear();
    const targetMonth = selectedActionsDate.getMonth();

    const monthActions = actions.filter(a => {
      // Non-admins can only see current month
      if (!isAdmin && actionsMonthOffset !== 0) return false;
      // Non-admins only see their own actions
      if (!isAdmin && currentTeamMember?.id && a.consultantId !== currentTeamMember.id) return false;
      const d = parseISO(a.date);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
    
    // Apply team member filter if selected (relevant for admins)
    const filteredActions = actionsFilter === 'all' 
      ? monthActions 
      : monthActions.filter(a => a.consultantId === actionsFilter);
    
    return [...filteredActions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(action => {
        const consultant = teamMembers.find(m => m.id === action.consultantId);
        const professional = professionals.find(p => p.id === action.professionalId);
        const actionType = actionTypes.find(t => t.id === action.actionTypeId);

        const hasProfessionalBonus = action.professionalId && 
          actionType?.bonusPointsWithProfessional && 
          actionType.bonusPointsWithProfessional > 0 &&
          ['relacionamento', 'venda'].includes(actionType?.classification || '');
        const bonusPoints = hasProfessionalBonus ? actionType.bonusPointsWithProfessional : 0;

        const actionCredits = creditTransactions.filter(
          ct => ct.actionId === action.id && ct.consultantId === action.consultantId
        );
        const creditedPoints = actionCredits.reduce(
          (sum, ct) => sum + (ct.type === 'ganho' ? ct.amount : -ct.amount),
          0
        );
        // Base points (without bonus)
        const basePoints = action.pointsGenerated || 0;
        // If we have credit transactions, derive base from credited minus bonus
        const effectiveBasePoints = actionCredits.length > 0 
          ? creditedPoints - (bonusPoints || 0)
          : basePoints;

        return {
          ...action,
          consultantName: consultant?.name || '-',
          professionalName: professional?.name || '-',
          actionTypeName: actionType?.name || '-',
          value: action.value ?? actionPresentedValueMap[action.id] ?? undefined,
          bonusPoints,
          basePoints: effectiveBasePoints,
        };
      });
  }, [actions, creditTransactions, teamMembers, professionals, actionTypes, actionsFilter, selectedActionsDate, isAdmin, actionsMonthOffset, currentTeamMember, actionPresentedValueMap]);

  // Team members available for filter (respecting permissions)
  const availableTeamMembersForFilter = useMemo(() => {
    // If admin, show all active members
    if (isAdmin) {
      return activeMembers;
    }
    // If user has team member, only show their own option
    if (currentTeamMember) {
      return activeMembers.filter(m => m.id === currentTeamMember.id);
    }
    return [];
  }, [isAdmin, currentTeamMember, activeMembers]);

  // Check if current user can edit an action (is creator or admin)
  const canEditAction = (action: Action) => {
    // Admins can always edit
    if (isAdmin) return true;
    // Creator can edit their own actions
    if (currentTeamMember?.id && action.consultantId === currentTeamMember.id) return true;
    return false;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Show skeleton while loading
  if (isLoading || isCurrentTeamMemberLoading) {
    return (
      <>
        <DashboardSkeleton />
        {showTimeoutMessage && <LoadingTimeoutMessage />}
      </>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header with Register Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h1 className="text-xl sm:text-2xl">Dashboard</h1>
          <span className="text-xs tracking-widest uppercase text-muted-foreground">
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <button
          onClick={() => setShowActionModal(true)}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Registrar Ação
        </button>
      </div>

      {/* Cleanliness weekly check bar */}
      <CleanlinessCheckBar />

      {/* General Metrics */}
      <section>
        <h2 className="title-section mb-4">Metas Mensais</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <MetricCard
            value={formatCurrency(monthlyMetrics.sales.value)}
            label="Valor Vendido"
            percentage={monthlyMetrics.sales.percentage}
            subtitle={`Meta: ${formatCurrency(monthlyMetrics.sales.meta)}`}
          />
          <MetricCard
            value={monthlyMetrics.captacoes.value}
            label="Captações"
            percentage={monthlyMetrics.captacoes.percentage}
            subtitle={`Meta: ${monthlyMetrics.captacoes.meta}`}
          />
          <MetricCard
            value={monthlyMetrics.acoes.value}
            label="Ações"
            percentage={monthlyMetrics.acoes.percentage}
            subtitle={`Meta: ${monthlyMetrics.acoes.meta}`}
          />
          {(engenhariaMetric.meta > 0 || engenhariaMetric.value > 0) && (
            <MetricCard
              value={formatCurrency(engenhariaMetric.value)}
              label="Valor Vendido — Engenharia"
              percentage={engenhariaMetric.percentage}
              subtitle={`Meta: ${formatCurrency(engenhariaMetric.meta)}`}
            />
          )}
        </div>
      </section>

      {/* Pipeline de Apresentações */}
      <section>
        <h2 className="title-section mb-4">Pipeline de Apresentações</h2>
        <PlannerTab />
      </section>

      {/* Yearly Results Board - Admin Only */}
      {isAdmin && <YearlyResultsBoard />}

      {/* Current Month Actions - Collapsible Section */}
      <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
        <div className="border border-border">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {actionsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="text-sm tracking-widest uppercase font-medium">
                {isAdmin ? 'Ações' : 'Ações do Mês'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{currentMonthActions.length} ações</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {currentMonthActions.reduce((sum, a) => sum + (a.basePoints || 0) + (a.bonusPoints || 0), 0)} pts
              </span>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4">

              {/* Month Navigator (Admin only) */}
              {isAdmin && (
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={() => setActionsMonthOffset(o => o - 1)}
                    className="p-1 hover:opacity-70"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm tracking-widest uppercase min-w-[180px] text-center">
                    {selectedActionsMonthLabel}
                  </span>
                  <button
                    onClick={() => setActionsMonthOffset(o => Math.min(o + 1, 0))}
                    className="p-1 hover:opacity-70"
                    disabled={actionsMonthOffset >= 0}
                  >
                    <ChevronRight className={`w-5 h-5 ${actionsMonthOffset >= 0 ? 'opacity-30' : ''}`} />
                  </button>
                </div>
              )}

              {/* Team Member Filter */}
              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs tracking-widest uppercase text-muted-foreground whitespace-nowrap">
                  Filtrar por:
                </label>
                <select
                  value={actionsFilter}
                  onChange={(e) => setActionsFilter(e.target.value)}
                  className="flex h-9 w-full max-w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {(isAdmin || availableTeamMembersForFilter.length > 1) && (
                    <option value="all">Todos</option>
                  )}
                  {availableTeamMembersForFilter.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              {/* Actions List */}
              <div>
                <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-3">
                  Ações do Mês ({currentMonthActions.length})
                </h3>
                
                {/* Desktop Table */}
                <div className="card-flat overflow-hidden hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black">
                        <th className="table-header text-left p-3">Data</th>
                        <th className="table-header text-left p-3">Consultor</th>
                        <th className="table-header text-left p-3">Profissional</th>
                        <th className="table-header text-left p-3">Tipo</th>
                        <th className="table-header text-left p-3">Valor</th>
                        <th className="table-header text-left p-3">Pts</th>
                        {currentMonthActions.some(a => a.bonusPoints > 0) && (
                          <th className="table-header text-left p-3">Bônus</th>
                        )}
                        <th className="table-header text-right p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMonthActions.map((action) => (
                        <tr key={action.id} className="border-b border-black/10 last:border-0">
                          <td className="p-3 text-sm">{format(parseISO(action.date), 'dd/MM')}</td>
                          <td className="p-3 text-sm">{action.consultantName}</td>
                          <td className="p-3 text-sm">{action.professionalName}</td>
                          <td className="p-3 text-sm">{action.actionTypeName}</td>
                          <td className="p-3 text-sm">{action.value ? formatCurrency(action.value) : '-'}</td>
                          <td className="p-3 text-sm">{action.basePoints}</td>
                          {currentMonthActions.some(a => a.bonusPoints > 0) && (
                            <td className="p-3 text-sm">
                              {action.bonusPoints > 0 ? (
                                <span className="text-success font-medium">+{action.bonusPoints}</span>
                              ) : '-'}
                            </td>
                          )}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEditAction(action) && (
                                <button
                                  onClick={() => setEditingAction(action)}
                                   className="p-2 text-primary"
                                  title="Editar ação"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeletingActionId(action.id)}
                                className="p-2 opacity-40 hover:opacity-100 text-destructive"
                                title="Excluir ação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {currentMonthActions.map((action) => (
                    <div key={action.id} className="card-flat">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium">{action.professionalName}</p>
                          <p className="text-xs text-muted-foreground">{action.consultantName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground mr-2">{format(parseISO(action.date), 'dd/MM')}</span>
                          {canEditAction(action) && (
                            <button
                              onClick={() => setEditingAction(action)}
                              className="p-1 text-primary"
                              title="Editar ação"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingActionId(action.id)}
                            className="p-1 opacity-40 hover:opacity-100 text-destructive"
                            title="Excluir ação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{action.actionTypeName}</span>
                        <div className="flex gap-3">
                          {action.value && <span>{formatCurrency(action.value)}</span>}
                          <span className="text-muted-foreground">{action.basePoints} pts</span>
                          {action.bonusPoints > 0 && (
                            <span className="text-success font-medium">+{action.bonusPoints} bônus</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Metrics by Consultant - Grouped by Area */}
      <section>
        <h2 className="title-section mb-4">Indicadores por Colaborador</h2>
        {Object.keys(consultantsByArea).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum colaborador com metas ou ações registradas.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(consultantsByArea).map(([areaName, consultants]) => (
              <div key={areaName}>
                <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-3 border-b border-black/10 pb-2">
                  {areaName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {consultants.map((consultant) => (
                    <div key={consultant.id} className="card-flat">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium">{consultant.name}</h3>
                        </div>
                        <span className="text-xs text-muted-foreground">{consultant.totalProfessionals} prof.</span>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Show action count when consultant has actions but no goals */}
                        {consultant.metricsForArea.length === 0 && consultant.hasActions && (
                          <div className="space-y-2">
                            <div className="text-xs text-amber-600 font-medium">
                              Sem meta definida
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">{consultant.actionCount}</span>
                              <span className="text-muted-foreground ml-1">
                                {consultant.isProjectsArea
                                  ? (consultant.actionCount === 1 ? 'ambiente registrado' : 'ambientes registrados')
                                  : (consultant.actionCount === 1 ? 'ação registrada' : 'ações registradas')
                                }
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Primary metrics (Vendas, Captação, Ações) */}
                        {consultant.metricsForArea.filter(m => m.isPrimary).map((metric) => (
                          <div key={metric.type} className="space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs font-medium tracking-wider">{metric.label}</span>
                              <span className="text-base font-semibold">
                                {metric.isCurrency 
                                  ? formatCurrency(metric.value as number) 
                                  : metric.value}
                              </span>
                            </div>
                            <div className={`h-1.5 rounded-sm ${metric.value === 0 ? 'bg-transparent' : 'bg-muted'}`}>
                              <div 
                                className={`h-full rounded-sm transition-all ${metric.onTarget ? 'bg-success' : 'bg-destructive'}`} 
                                style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                Meta: {metric.isCurrency 
                                  ? formatCurrency(metric.meta) 
                                  : Math.round(metric.meta)}
                              </span>
                              <span className="font-medium text-foreground">
                                {metric.percentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Secondary metrics (Projetos, Categorias) */}
                        {consultant.metricsForArea.filter(m => !m.isPrimary).length > 0 && (
                          <div className="pt-2 mt-1 border-t border-black/20">
                            <div className="space-y-2">
                              {consultant.metricsForArea.filter(m => !m.isPrimary).map((metric) => (
                                <div key={metric.type}>
                                  {metric.isCategory ? (
                                    // Category metrics: show category name, meta below, current % in bar
                                    <>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-xs text-black font-medium">{metric.label}</span>
                                        <span className="text-[10px] text-black/70">
                                          Meta: {(metric as { isMaxLimit?: boolean }).isMaxLimit ? 'menos que' : 'mais que'} {Math.round(metric.meta)}%
                                        </span>
                                      </div>
                                      <div className="h-1 bg-black/20 mt-1 relative">
                                        <div 
                                          className={`h-full ${metric.onTarget ? 'bg-success' : 'bg-destructive'}`} 
                                          style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                                        />
                                      </div>
                                      <div className="text-xs font-bold text-black mt-0.5">
                                        {metric.value}
                                      </div>
                                    </>
                                  ) : (
                                    // Non-category secondary metrics (Projetos, etc)
                                    <>
                                      <div className="flex justify-between items-baseline text-xs">
                                        <span className="text-black/80 font-medium">{metric.label}</span>
                                        <span className="text-black">
                                          {metric.isCurrency 
                                            ? formatCurrency(metric.value as number) 
                                            : metric.value}
                                          <span className="ml-2 text-black/70">
                                            ({metric.percentage.toFixed(0)}%)
                                          </span>
                                        </span>
                                      </div>
                                      <div className="h-0.5 bg-black/20 mt-1">
                                        <div 
                                          className={`h-full ${metric.onTarget ? 'bg-success' : 'bg-destructive'}`} 
                                          style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                                        />
                                      </div>
                                      <div className="text-[10px] text-black/70 mt-0.5">
                                        Meta: {metric.isCurrency 
                                          ? formatCurrency(metric.meta) 
                                          : Math.round(metric.meta)}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {consultant.categoryBreakdown.length > 0 && consultant.categoryBreakdown.some(c => c.count > 0) && (
                          <div className="pt-2 border-t border-black/20">
                            <div className="text-[10px] text-black font-semibold mb-1 uppercase tracking-wider">Categorias</div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              {consultant.categoryBreakdown.filter(c => c.count > 0).map((cat) => {
                                const percentage = consultant.totalProfessionals > 0 
                                  ? ((cat.count / consultant.totalProfessionals) * 100).toFixed(2)
                                  : '0.00';
                                return (
                                  <span key={cat.name} className="text-[10px] text-black/80">
                                    {cat.name}: {cat.count} <span className="text-black font-bold">({percentage}%)</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ActionModal open={showActionModal} onOpenChange={setShowActionModal} />
      <EditActionModal 
        open={!!editingAction} 
        onOpenChange={(open) => !open && setEditingAction(null)} 
        action={editingAction}
      />
      <DeleteActionConfirmDialog
        open={!!deletingActionId}
        onOpenChange={(open) => !open && setDeletingActionId(null)}
        actionId={deletingActionId}
        onConfirm={() => {
          if (deletingActionId) {
            deleteAction(deletingActionId);
            setDeletingActionId(null);
          }
        }}
      />
    </div>
  );
}
