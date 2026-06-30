import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePositions } from '@/hooks/usePositions';
import { useMonthlyEnvironmentStats } from '@/hooks/useProjectEnvironments';
import { parseISO, getMonth, getYear, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, Users, Target, BarChart3 } from 'lucide-react';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MonthlyMemberData {
  vendas: number;
  captacoes: number;
  acoes: number;
  ambientes: number;
}

interface MemberYearlyData {
  memberId: string;
  memberName: string;
  areaName: string;
  areaId: string | null;
  monthlyData: MonthlyMemberData[];
  totals: MonthlyMemberData;
  goals: {
    vendas: number;
    captacoes: number;
    acoes: number;
    ambientes: number;
  };
}

interface AreaYearlyData {
  areaId: string;
  areaName: string;
  monthlyData: MonthlyMemberData[];
  totals: MonthlyMemberData;
  goals: MonthlyMemberData;
  memberCount: number;
}

export function ManagementDashboard() {
  const { actions, actionTypes, teamMembers, metas } = useApp();
  const { getMemberAreaIds, getAreaName, areas } = usePositions();
  
  const targetYear = 2026;
  const currentMonth = new Date().getMonth();
  const [selectedArea, setSelectedArea] = useState<string>('all');
  
  // Get environment stats for the current year
  const { data: envStats } = useMonthlyEnvironmentStats(targetYear, currentMonth + 1);

  // Get active metas (compare by calendar date to avoid timezone parsing bug)
  const activeMetas = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return metas.filter(m => {
      if (!m.isActive) return false;
      if (m.endDate && m.endDate.slice(0, 10) < todayStr) return false;
      if (m.startDate && m.startDate.slice(0, 10) > todayStr) return false;
      return true;
    });
  }, [metas]);

  const activeMembers = teamMembers.filter(m => m.active);

  // Calculate yearly data per member
  const memberYearlyData = useMemo((): MemberYearlyData[] => {
    return activeMembers.map(member => {
      const memberAreaIds = getMemberAreaIds(member.id);
      const primaryAreaId = memberAreaIds[0] || member.areaId;
      const primaryAreaName = primaryAreaId ? getAreaName(primaryAreaId) : 'Sem Área';

      // Initialize monthly data
      const monthlyData: MonthlyMemberData[] = Array.from({ length: 12 }, () => ({
        vendas: 0,
        captacoes: 0,
        acoes: 0,
        ambientes: 0,
      }));

      // Process actions for this member
      actions.forEach(action => {
        if (action.consultantId !== member.id) return;
        
        const actionDate = parseISO(action.date);
        if (getYear(actionDate) !== targetYear) return;
        
        const monthIndex = getMonth(actionDate);
        const actionType = actionTypes.find(t => t.id === action.actionTypeId);
        
        // Vendas
        if (actionType?.classification === 'venda') {
          monthlyData[monthIndex].vendas += action.value || 0;
        }
        
        // Captações
        if (actionType?.impactsMetas.includes('captacao')) {
          monthlyData[monthIndex].captacoes += 1;
        }
        
        // Ações (total actions for member)
        monthlyData[monthIndex].acoes += 1;
      });

      // Get member's goals
      const memberMetas = activeMetas.filter(m => m.teamMemberId === member.id);
      const areaMetas = memberMetas.length > 0 
        ? memberMetas 
        : activeMetas.filter(m => m.areaId === member.areaId && !m.teamMemberId);

      const goals = {
        vendas: areaMetas.filter(m => m.type === 'vendas').reduce((sum, m) => sum + m.value, 0),
        captacoes: areaMetas.filter(m => m.type === 'captacao').reduce((sum, m) => sum + m.value, 0),
        acoes: areaMetas.filter(m => m.type === 'acoes').reduce((sum, m) => sum + m.value, 0),
        ambientes: areaMetas.filter(m => m.type === 'projeto').reduce((sum, m) => sum + m.value, 0),
      };

      // Calculate totals
      const totals = monthlyData.reduce(
        (acc, month) => ({
          vendas: acc.vendas + month.vendas,
          captacoes: acc.captacoes + month.captacoes,
          acoes: acc.acoes + month.acoes,
          ambientes: acc.ambientes + month.ambientes,
        }),
        { vendas: 0, captacoes: 0, acoes: 0, ambientes: 0 }
      );

      return {
        memberId: member.id,
        memberName: member.name,
        areaName: primaryAreaName,
        areaId: primaryAreaId,
        monthlyData,
        totals,
        goals,
      };
    }).filter(m => {
      // Filter by selected area
      if (selectedArea === 'all') return true;
      return m.areaId === selectedArea;
    });
  }, [activeMembers, actions, actionTypes, activeMetas, getMemberAreaIds, getAreaName, selectedArea, targetYear]);

  // Calculate yearly data per area
  const areaYearlyData = useMemo((): AreaYearlyData[] => {
    const areaMap = new Map<string, AreaYearlyData>();

    memberYearlyData.forEach(member => {
      const areaId = member.areaId || 'sem-area';
      
      if (!areaMap.has(areaId)) {
        areaMap.set(areaId, {
          areaId,
          areaName: member.areaName,
          monthlyData: Array.from({ length: 12 }, () => ({
            vendas: 0,
            captacoes: 0,
            acoes: 0,
            ambientes: 0,
          })),
          totals: { vendas: 0, captacoes: 0, acoes: 0, ambientes: 0 },
          goals: { vendas: 0, captacoes: 0, acoes: 0, ambientes: 0 },
          memberCount: 0,
        });
      }

      const areaData = areaMap.get(areaId)!;
      areaData.memberCount++;

      // Sum monthly data
      member.monthlyData.forEach((month, idx) => {
        areaData.monthlyData[idx].vendas += month.vendas;
        areaData.monthlyData[idx].captacoes += month.captacoes;
        areaData.monthlyData[idx].acoes += month.acoes;
        areaData.monthlyData[idx].ambientes += month.ambientes;
      });

      // Sum totals
      areaData.totals.vendas += member.totals.vendas;
      areaData.totals.captacoes += member.totals.captacoes;
      areaData.totals.acoes += member.totals.acoes;
      areaData.totals.ambientes += member.totals.ambientes;

      // Sum goals
      areaData.goals.vendas += member.goals.vendas;
      areaData.goals.captacoes += member.goals.captacoes;
      areaData.goals.acoes += member.goals.acoes;
      areaData.goals.ambientes += member.goals.ambientes;
    });

    return Array.from(areaMap.values()).sort((a, b) => a.areaName.localeCompare(b.areaName));
  }, [memberYearlyData]);

  // Global totals
  const globalTotals = useMemo(() => {
    return areaYearlyData.reduce(
      (acc, area) => ({
        vendas: acc.vendas + area.totals.vendas,
        captacoes: acc.captacoes + area.totals.captacoes,
        acoes: acc.acoes + area.totals.acoes,
        ambientes: acc.ambientes + area.totals.ambientes,
        goalVendas: acc.goalVendas + area.goals.vendas,
        goalCaptacoes: acc.goalCaptacoes + area.goals.captacoes,
        goalAcoes: acc.goalAcoes + area.goals.acoes,
        goalAmbientes: acc.goalAmbientes + area.goals.ambientes,
      }),
      { vendas: 0, captacoes: 0, acoes: 0, ambientes: 0, goalVendas: 0, goalCaptacoes: 0, goalAcoes: 0, goalAmbientes: 0 }
    );
  }, [areaYearlyData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressIcon = (percentage: number) => {
    if (percentage >= 100) return <TrendingUp className="h-4 w-4" />;
    if (percentage >= 70) return <Minus className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const calculateMonthlyProgress = (value: number, goal: number) => {
    // Goal is annual, so monthly target is goal / 12 * (currentMonth + 1)
    const monthlyTarget = goal > 0 ? (goal / 12) * (currentMonth + 1) : 0;
    return monthlyTarget > 0 ? (value / monthlyTarget) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Painel de Resultados — {targetYear}</h2>
        </div>
        
        <Select value={selectedArea} onValueChange={setSelectedArea}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Áreas</SelectItem>
            {areas.map(area => (
              <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Vendas YTD</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(globalTotals.vendas)}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs ${getProgressColor(calculateMonthlyProgress(globalTotals.vendas, globalTotals.goalVendas))}`}>
                {calculateMonthlyProgress(globalTotals.vendas, globalTotals.goalVendas).toFixed(0)}% da meta
              </span>
              {getProgressIcon(calculateMonthlyProgress(globalTotals.vendas, globalTotals.goalVendas))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Captações YTD</span>
            </div>
            <p className="text-2xl font-bold mt-1">{globalTotals.captacoes}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs ${getProgressColor(calculateMonthlyProgress(globalTotals.captacoes, globalTotals.goalCaptacoes))}`}>
                {calculateMonthlyProgress(globalTotals.captacoes, globalTotals.goalCaptacoes).toFixed(0)}% da meta
              </span>
              {getProgressIcon(calculateMonthlyProgress(globalTotals.captacoes, globalTotals.goalCaptacoes))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Ações YTD</span>
            </div>
            <p className="text-2xl font-bold mt-1">{globalTotals.acoes}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs ${getProgressColor(calculateMonthlyProgress(globalTotals.acoes, globalTotals.goalAcoes))}`}>
                {calculateMonthlyProgress(globalTotals.acoes, globalTotals.goalAcoes).toFixed(0)}% da meta
              </span>
              {getProgressIcon(calculateMonthlyProgress(globalTotals.acoes, globalTotals.goalAcoes))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Colaboradores</span>
            </div>
            <p className="text-2xl font-bold mt-1">{memberYearlyData.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              em {areaYearlyData.length} áreas
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="areas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="areas">Por Área</TabsTrigger>
          <TabsTrigger value="members">Por Colaborador</TabsTrigger>
          <TabsTrigger value="monthly">Evolução Mensal</TabsTrigger>
        </TabsList>

        {/* Por Área Tab */}
        <TabsContent value="areas" className="space-y-4">
          <div className="card-flat overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="table-header text-left p-3">Área</th>
                  <th className="table-header text-center p-2">Colaboradores</th>
                  <th className="table-header text-right p-2">Vendas</th>
                  <th className="table-header text-center p-2">% Meta</th>
                  <th className="table-header text-right p-2">Captações</th>
                  <th className="table-header text-center p-2">% Meta</th>
                  <th className="table-header text-right p-2">Ações</th>
                  <th className="table-header text-center p-2">% Meta</th>
                </tr>
              </thead>
              <tbody>
                {areaYearlyData.map((area) => {
                  const vendasProgress = calculateMonthlyProgress(area.totals.vendas, area.goals.vendas);
                  const captProgress = calculateMonthlyProgress(area.totals.captacoes, area.goals.captacoes);
                  const acoesProgress = calculateMonthlyProgress(area.totals.acoes, area.goals.acoes);
                  
                  return (
                    <tr key={area.areaId} className="border-b border-black/10 hover:bg-muted/50">
                      <td className="p-3 font-medium">{area.areaName}</td>
                      <td className="p-2 text-center">{area.memberCount}</td>
                      <td className="p-2 text-right">{formatCurrency(area.totals.vendas)}</td>
                      <td className={`p-2 text-center font-medium ${getProgressColor(vendasProgress)}`}>
                        {vendasProgress.toFixed(0)}%
                      </td>
                      <td className="p-2 text-right">{area.totals.captacoes}</td>
                      <td className={`p-2 text-center font-medium ${getProgressColor(captProgress)}`}>
                        {captProgress.toFixed(0)}%
                      </td>
                      <td className="p-2 text-right">{area.totals.acoes}</td>
                      <td className={`p-2 text-center font-medium ${getProgressColor(acoesProgress)}`}>
                        {acoesProgress.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-bold">
                  <td className="p-3">Total</td>
                  <td className="p-2 text-center">{memberYearlyData.length}</td>
                  <td className="p-2 text-right">{formatCurrency(globalTotals.vendas)}</td>
                  <td className={`p-2 text-center ${getProgressColor(calculateMonthlyProgress(globalTotals.vendas, globalTotals.goalVendas))}`}>
                    {calculateMonthlyProgress(globalTotals.vendas, globalTotals.goalVendas).toFixed(0)}%
                  </td>
                  <td className="p-2 text-right">{globalTotals.captacoes}</td>
                  <td className={`p-2 text-center ${getProgressColor(calculateMonthlyProgress(globalTotals.captacoes, globalTotals.goalCaptacoes))}`}>
                    {calculateMonthlyProgress(globalTotals.captacoes, globalTotals.goalCaptacoes).toFixed(0)}%
                  </td>
                  <td className="p-2 text-right">{globalTotals.acoes}</td>
                  <td className={`p-2 text-center ${getProgressColor(calculateMonthlyProgress(globalTotals.acoes, globalTotals.goalAcoes))}`}>
                    {calculateMonthlyProgress(globalTotals.acoes, globalTotals.goalAcoes).toFixed(0)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </TabsContent>

        {/* Por Colaborador Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="card-flat overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="table-header text-left p-3">Colaborador</th>
                  <th className="table-header text-left p-2">Área</th>
                  <th className="table-header text-right p-2">Vendas</th>
                  <th className="table-header text-center p-2">% Meta</th>
                  <th className="table-header text-right p-2">Captações</th>
                  <th className="table-header text-center p-2">% Meta</th>
                  <th className="table-header text-right p-2">Ações</th>
                  <th className="table-header text-center p-2">% Meta</th>
                </tr>
              </thead>
              <tbody>
                {memberYearlyData.map((member) => {
                  const vendasProgress = calculateMonthlyProgress(member.totals.vendas, member.goals.vendas);
                  const captProgress = calculateMonthlyProgress(member.totals.captacoes, member.goals.captacoes);
                  const acoesProgress = calculateMonthlyProgress(member.totals.acoes, member.goals.acoes);
                  
                  return (
                    <tr key={member.memberId} className="border-b border-black/10 hover:bg-muted/50">
                      <td className="p-3 font-medium">{member.memberName}</td>
                      <td className="p-2 text-sm text-muted-foreground">{member.areaName}</td>
                      <td className="p-2 text-right">{formatCurrency(member.totals.vendas)}</td>
                      <td className={`p-2 text-center font-medium ${getProgressColor(vendasProgress)}`}>
                        {member.goals.vendas > 0 ? `${vendasProgress.toFixed(0)}%` : '-'}
                      </td>
                      <td className="p-2 text-right">{member.totals.captacoes}</td>
                      <td className={`p-2 text-center font-medium ${getProgressColor(captProgress)}`}>
                        {member.goals.captacoes > 0 ? `${captProgress.toFixed(0)}%` : '-'}
                      </td>
                      <td className="p-2 text-right">{member.totals.acoes}</td>
                      <td className={`p-2 text-center font-medium ${getProgressColor(acoesProgress)}`}>
                        {member.goals.acoes > 0 ? `${acoesProgress.toFixed(0)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Evolução Mensal Tab */}
        <TabsContent value="monthly" className="space-y-4">
          {/* Vendas Evolution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Evolução de Vendas por Mês</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-black">
                    <th className="table-header text-left p-2">Colaborador</th>
                    {MONTH_LABELS.map((month, idx) => (
                      <th 
                        key={month} 
                        className={`table-header text-center p-2 text-xs ${idx === currentMonth ? 'bg-primary/10' : ''}`}
                      >
                        {month}
                      </th>
                    ))}
                    <th className="table-header text-center p-2 bg-muted">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {memberYearlyData.filter(m => m.goals.vendas > 0 || m.totals.vendas > 0).map((member) => (
                    <tr key={member.memberId} className="border-b border-black/10">
                      <td className="p-2 text-sm font-medium truncate max-w-[120px]" title={member.memberName}>
                        {member.memberName.split(' ').slice(0, 2).join(' ')}
                      </td>
                      {member.monthlyData.map((data, idx) => (
                        <td 
                          key={idx} 
                          className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/50' : ''}`}
                        >
                          {formatCurrency(data.vendas)}
                        </td>
                      ))}
                      <td className="p-2 text-center text-sm font-bold bg-muted">
                        {formatCurrency(member.totals.vendas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Captações Evolution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Evolução de Captações por Mês</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-black">
                    <th className="table-header text-left p-2">Colaborador</th>
                    {MONTH_LABELS.map((month, idx) => (
                      <th 
                        key={month} 
                        className={`table-header text-center p-2 text-xs ${idx === currentMonth ? 'bg-primary/10' : ''}`}
                      >
                        {month}
                      </th>
                    ))}
                    <th className="table-header text-center p-2 bg-muted">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {memberYearlyData.filter(m => m.goals.captacoes > 0 || m.totals.captacoes > 0).map((member) => (
                    <tr key={member.memberId} className="border-b border-black/10">
                      <td className="p-2 text-sm font-medium truncate max-w-[120px]" title={member.memberName}>
                        {member.memberName.split(' ').slice(0, 2).join(' ')}
                      </td>
                      {member.monthlyData.map((data, idx) => (
                        <td 
                          key={idx} 
                          className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/50' : ''}`}
                        >
                          {data.captacoes}
                        </td>
                      ))}
                      <td className="p-2 text-center text-sm font-bold bg-muted">
                        {member.totals.captacoes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Ações Evolution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Evolução de Ações por Mês</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-black">
                    <th className="table-header text-left p-2">Colaborador</th>
                    {MONTH_LABELS.map((month, idx) => (
                      <th 
                        key={month} 
                        className={`table-header text-center p-2 text-xs ${idx === currentMonth ? 'bg-primary/10' : ''}`}
                      >
                        {month}
                      </th>
                    ))}
                    <th className="table-header text-center p-2 bg-muted">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {memberYearlyData.filter(m => m.goals.acoes > 0 || m.totals.acoes > 0).map((member) => (
                    <tr key={member.memberId} className="border-b border-black/10">
                      <td className="p-2 text-sm font-medium truncate max-w-[120px]" title={member.memberName}>
                        {member.memberName.split(' ').slice(0, 2).join(' ')}
                      </td>
                      {member.monthlyData.map((data, idx) => (
                        <td 
                          key={idx} 
                          className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/50' : ''}`}
                        >
                          {data.acoes}
                        </td>
                      ))}
                      <td className="p-2 text-center text-sm font-bold bg-muted">
                        {member.totals.acoes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
