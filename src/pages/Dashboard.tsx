import { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { MetricCard } from '@/components/MetricCard';
import { ActionModal } from '@/components/ActionModal';
import { YearlyResultsBoard } from '@/components/YearlyResultsBoard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, parseISO, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const { isAdmin } = useAuthContext();
  const { 
    actions, 
    metas, 
    areas, 
    teamMembers, 
    actionTypes, 
    professionals,
    professionalCategories,
    deleteAction 
  } = useApp();

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
        return type?.classification === 'venda';
      })
      .reduce((sum, a) => sum + (a.value || 0), 0);

    const totalCaptacoes = thisMonthActions.filter(a => {
      const type = actionTypes.find(t => t.id === a.actionTypeId);
      return type?.impactsMetas.includes('captacao');
    }).length;

    // Get areas that have active 'acoes' goals
    const areasWithAcoesMeta = activeMetas
      .filter(m => m.type === 'acoes')
      .map(m => m.areaId);

    // Get active members whose areas have 'acoes' goals
    const membersWithAcoesMeta = activeMembers
      .filter(m => areasWithAcoesMeta.includes(m.areaId))
      .map(m => m.id);

    // Count only actions from consultants with 'acoes' goals
    const totalAcoes = thisMonthActions.filter(a => 
      membersWithAcoesMeta.includes(a.consultantId)
    ).length;

    // Get active metas only
    const salesMeta = activeMetas.filter(m => m.type === 'vendas').reduce((sum, m) => sum + m.value, 0);
    const captacaoMeta = activeMetas.filter(m => m.type === 'captacao').reduce((sum, m) => sum + m.value, 0);
    const acoesMeta = activeMetas.filter(m => m.type === 'acoes').reduce((sum, m) => sum + m.value, 0);

    return {
      sales: { value: totalSales, meta: salesMeta, percentage: salesMeta > 0 ? (totalSales / salesMeta) * 100 : 0 },
      captacoes: { value: totalCaptacoes, meta: captacaoMeta, percentage: captacaoMeta > 0 ? (totalCaptacoes / captacaoMeta) * 100 : 0 },
      acoes: { value: totalAcoes, meta: acoesMeta, percentage: acoesMeta > 0 ? (totalAcoes / acoesMeta) * 100 : 0 },
    };
  }, [actions, activeMetas, actionTypes, activeMembers]);

  // Metrics by consultant
  const consultantMetrics = useMemo(() => {
    return activeMembers.map(member => {
      const memberArea = areas.find(a => a.id === member.areaId);
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
      const categoryBreakdown = professionalCategories.map(cat => ({
        name: cat.name,
        count: memberProfessionals.filter(p => p.categoryId === cat.id).length,
      }));

      // Get all ACTIVE metas for this area
      const areaMetas = activeMetas.filter(m => m.areaId === member.areaId);
      const areaMembers = activeMembers.filter(m => m.areaId === member.areaId).length;
      
      // Build metrics only for goals that exist in this area
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
      }> = [];

      // Build metrics only for goals that exist in this area AND have value > 1
      areaMetas.filter(meta => meta.value > 1).forEach(meta => {
        const individualMeta = areaMembers > 0 ? meta.value / areaMembers : 0;
        
        if (meta.type === 'vendas') {
          metricsForArea.push({
            type: 'vendas',
            label: 'VENDAS',
            value: totalSales,
            meta: individualMeta,
            percentage: individualMeta > 0 ? (totalSales / individualMeta) * 100 : 0,
            isCurrency: true,
            isPrimary: true,
            order: 1,
          });
        } else if (meta.type === 'captacao') {
          const totalCaptacoes = thisMonthActions.filter(a => {
            const type = actionTypes.find(t => t.id === a.actionTypeId);
            return type?.impactsMetas.includes('captacao');
          }).length;
          metricsForArea.push({
            type: 'captacao',
            label: 'CAPTAÇÃO',
            value: totalCaptacoes,
            meta: individualMeta,
            percentage: individualMeta > 0 ? (totalCaptacoes / individualMeta) * 100 : 0,
            isPrimary: true,
            order: 2,
          });
        } else if (meta.type === 'acoes') {
          metricsForArea.push({
            type: 'acoes',
            label: 'AÇÕES',
            value: totalAcoes,
            meta: individualMeta,
            percentage: individualMeta > 0 ? (totalAcoes / individualMeta) * 100 : 0,
            isPrimary: true,
            order: 3,
          });
        } else if (meta.type === 'projeto') {
          const totalProjetos = thisMonthActions.filter(a => {
            const type = actionTypes.find(t => t.id === a.actionTypeId);
            return type?.impactsMetas.includes('projeto');
          }).reduce((sum, a) => sum + (a.value || 0), 0);
          metricsForArea.push({
            type: 'projeto',
            label: 'PROJETOS',
            value: totalProjetos,
            meta: individualMeta,
            percentage: individualMeta > 0 ? (totalProjetos / individualMeta) * 100 : 0,
            isPrimary: false,
            order: 4,
          });
        } else if (meta.type === 'categoria' && meta.categoryId) {
          // Calculate percentage of professionals in the specified category
          const categoryCount = memberProfessionals.filter(p => p.categoryId === meta.categoryId).length;
          const percentage = memberProfessionals.length > 0 
            ? (categoryCount / memberProfessionals.length) * 100 
            : 0;
          const category = professionalCategories.find(c => c.id === meta.categoryId);
          metricsForArea.push({
            type: `categoria-${meta.categoryId}`, // Unique key per category
            label: `% ${category?.name?.toUpperCase() || 'CATEGORIA'}`,
            value: `${percentage.toFixed(0)}%`,
            meta: individualMeta,
            percentage: individualMeta > 0 ? (percentage / individualMeta) * 100 : 0,
            isCategory: true,
            isPrimary: false,
            order: 10,
          });
        }
      });
      
      // Sort metrics by order
      metricsForArea.sort((a, b) => (a.order || 99) - (b.order || 99));

      // Check if consultant has any goals > 1 or performed actions this month
      const hasGoals = metricsForArea.length > 0;
      const hasActions = thisMonthActions.length > 0;
      const actionCount = thisMonthActions.length;

      // RULE: Display consultant if they have actions OR goals
      // Actions take priority - never hide a consultant who has generated actions
      const shouldDisplay = hasActions || hasGoals;

      return {
        ...member,
        areaId: member.areaId,
        area: memberArea?.name || '',
        metricsForArea,
        categoryBreakdown,
        totalProfessionals: memberProfessionals.length,
        hasGoals,
        hasActions,
        actionCount,
        shouldDisplay,
      };
    });
  }, [activeMembers, actions, areas, metas, actionTypes, professionals, professionalCategories]);

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

  // Recent actions
  const recentActions = useMemo(() => {
    return [...actions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(action => {
        const consultant = teamMembers.find(m => m.id === action.consultantId);
        const professional = professionals.find(p => p.id === action.professionalId);
        const actionType = actionTypes.find(t => t.id === action.actionTypeId);
        return {
          ...action,
          consultantName: consultant?.name || '-',
          professionalName: professional?.name || '-',
          actionTypeName: actionType?.name || '-',
        };
      });
  }, [actions, teamMembers, professionals, actionTypes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

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
        </div>
      </section>

      {/* Yearly Results Board - Admin Only */}
      {isAdmin && <YearlyResultsBoard />}

      {/* Recent Actions - Collapsible Section */}
      <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
        <div className="border border-border">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {actionsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="text-sm tracking-widest uppercase font-medium">Ações Recentes</span>
            </div>
            <span className="text-xs text-muted-foreground">{recentActions.length} recentes</span>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4">

              {/* Recent Actions */}
              <div>
                <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-3">Ações Recentes</h3>
                
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
                        <th className="table-header text-right p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActions.map((action) => (
                        <tr key={action.id} className="border-b border-black/10 last:border-0">
                          <td className="p-3 text-sm">{format(parseISO(action.date), 'dd/MM')}</td>
                          <td className="p-3 text-sm">{action.consultantName}</td>
                          <td className="p-3 text-sm">{action.professionalName}</td>
                          <td className="p-3 text-sm">{action.actionTypeName}</td>
                          <td className="p-3 text-sm">{action.value ? formatCurrency(action.value) : '-'}</td>
                          <td className="p-3 text-sm">{action.pointsGenerated}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => deleteAction(action.id)}
                              className="p-2 opacity-40 hover:opacity-100 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {recentActions.map((action) => (
                    <div key={action.id} className="card-flat">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium">{action.professionalName}</p>
                          <p className="text-xs text-muted-foreground">{action.consultantName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{format(parseISO(action.date), 'dd/MM')}</span>
                          <button
                            onClick={() => deleteAction(action.id)}
                            className="p-1 opacity-40 hover:opacity-100 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{action.actionTypeName}</span>
                        <div className="flex gap-3">
                          {action.value && <span>{formatCurrency(action.value)}</span>}
                          <span className="text-muted-foreground">{action.pointsGenerated} pts</span>
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
                                {consultant.actionCount === 1 ? 'ação registrada' : 'ações registradas'}
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
                            <div className="h-1.5 bg-muted rounded-sm">
                              <div 
                                className="h-full bg-foreground rounded-sm transition-all" 
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
                          <div className="pt-2 mt-1 border-t border-black/10">
                            <div className="space-y-2">
                              {consultant.metricsForArea.filter(m => !m.isPrimary).map((metric) => (
                                <div key={metric.type}>
                                  <div className="flex justify-between items-baseline text-xs">
                                    <span className="text-muted-foreground">{metric.label}</span>
                                    <span className="text-muted-foreground">
                                      {metric.isCurrency 
                                        ? formatCurrency(metric.value as number) 
                                        : metric.value}
                                      <span className="ml-2 opacity-70">
                                        ({metric.percentage.toFixed(0)}%)
                                      </span>
                                    </span>
                                  </div>
                                  <div className="h-0.5 bg-muted mt-1">
                                    <div 
                                      className="h-full bg-muted-foreground/50" 
                                      style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {consultant.categoryBreakdown.length > 0 && consultant.categoryBreakdown.some(c => c.count > 0) && (
                          <div className="pt-2 border-t border-black/10">
                            <div className="flex flex-wrap gap-2">
                              {consultant.categoryBreakdown.filter(c => c.count > 0).map((cat) => (
                                <span key={cat.name} className="text-[10px] text-muted-foreground">
                                  {cat.name}: {cat.count}
                                </span>
                              ))}
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
    </div>
  );
}
