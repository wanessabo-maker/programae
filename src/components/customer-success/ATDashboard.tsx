import { useMemo, useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { MetricCard } from '@/components/MetricCard';
import { useTechnicalAssistances, TechnicalAssistance } from '@/hooks/useTechnicalAssistance';

export function ATDashboard() {
  const { data: allCases = [], isLoading } = useTechnicalAssistances();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate list of available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    allCases.forEach(c => {
      if (c.contact_date) {
        years.add(parseISO(c.contact_date).getFullYear());
      }
      if (c.solution_date) {
        years.add(parseISO(c.solution_date).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allCases, currentYear]);

  // Filter closed cases (completed AT cases represent clients attended)
  const closedCases = useMemo(() => {
    return allCases.filter(c => c.status === 'closed');
  }, [allCases]);

  // Cases by year
  const casesByYear = useMemo(() => {
    return closedCases.filter(c => {
      if (!c.solution_date) return false;
      const year = parseISO(c.solution_date).getFullYear();
      return year === selectedYear;
    });
  }, [closedCases, selectedYear]);

  // Monthly data for selected year
  const monthlyData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    return months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthCases = closedCases.filter(c => {
        if (!c.solution_date) return false;
        const solutionDate = parseISO(c.solution_date);
        return isWithinInterval(solutionDate, { start: monthStart, end: monthEnd });
      });

      const revenueCases = monthCases.filter(c => c.generated_revenue === true);

      return {
        month: format(monthDate, 'MMM', { locale: ptBR }),
        monthFull: format(monthDate, 'MMMM', { locale: ptBR }),
        count: monthCases.length,
        revenue: revenueCases.length,
      };
    });
  }, [closedCases, selectedYear]);

  // Annual summary
  const annualSummary = useMemo(() => {
    const totalClients = casesByYear.length;
    const revenueCases = casesByYear.filter(c => c.generated_revenue === true);
    const revenuePercent = totalClients > 0 ? (revenueCases.length / totalClients) * 100 : 0;
    
    // Compare with previous year
    const prevYearCases = closedCases.filter(c => {
      if (!c.solution_date) return false;
      const year = parseISO(c.solution_date).getFullYear();
      return year === selectedYear - 1;
    });
    
    const growth = prevYearCases.length > 0 
      ? ((totalClients - prevYearCases.length) / prevYearCases.length) * 100 
      : 0;

    return {
      totalClients,
      revenueCases: revenueCases.length,
      revenuePercent,
      growth,
      prevYearCount: prevYearCases.length,
    };
  }, [casesByYear, closedCases, selectedYear]);

  // Current month data
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthCases = closedCases.filter(c => {
      if (!c.solution_date) return false;
      const solutionDate = parseISO(c.solution_date);
      return isWithinInterval(solutionDate, { start: monthStart, end: monthEnd });
    });

    const revenueCases = monthCases.filter(c => c.generated_revenue === true);

    return {
      total: monthCases.length,
      revenue: revenueCases.length,
    };
  }, [closedCases]);

  // Open cases count
  const openCasesCount = useMemo(() => {
    return allCases.filter(c => c.status === 'open').length;
  }, [allCases]);

  const chartConfig = {
    count: {
      label: 'Atendimentos',
      color: 'hsl(var(--foreground))',
    },
    revenue: {
      label: 'Gerou Caixa',
      color: 'hsl(var(--success))',
    },
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-widest">Dashboard Analítico AT</h3>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input-flat text-xs px-3 py-1.5"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-flat">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-foreground" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Clientes Atendidos</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{annualSummary.totalClients}</div>
          <div className="text-xs text-muted-foreground mt-1">
            em {selectedYear}
          </div>
        </div>

        <div className="card-flat">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Gerou Caixa</span>
          </div>
          <div className="text-2xl font-bold text-success">{annualSummary.revenueCases}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {annualSummary.revenuePercent.toFixed(1)}% do total
          </div>
        </div>

        <div className="card-flat">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-foreground" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Mês Atual</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{currentMonthData.total}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {currentMonthData.revenue} geraram caixa
          </div>
        </div>

        <div className="card-flat">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-warning" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Em Aberto</span>
          </div>
          <div className="text-2xl font-bold text-warning">{openCasesCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            chamados pendentes
          </div>
        </div>
      </div>

      {/* Year Comparison */}
      {annualSummary.prevYearCount > 0 && (
        <div className="card-flat">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Comparativo com {selectedYear - 1}
            </span>
            <span className={`text-sm font-bold ${annualSummary.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
              {annualSummary.growth >= 0 ? '+' : ''}{annualSummary.growth.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              {selectedYear - 1}: <span className="font-medium text-foreground">{annualSummary.prevYearCount}</span>
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="text-muted-foreground">
              {selectedYear}: <span className="font-medium text-foreground">{annualSummary.totalClients}</span>
            </span>
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      <div className="card-flat">
        <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Evolução Mensal - {selectedYear}
        </h4>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar 
              dataKey="count" 
              name="Atendimentos" 
              fill="hsl(var(--foreground))" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="revenue" 
              name="Gerou Caixa" 
              fill="hsl(var(--success))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="card-flat">
        <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Detalhamento Mensal
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium uppercase tracking-widest text-foreground">Mês</th>
                <th className="text-right p-2 font-medium uppercase tracking-widest text-foreground">Atendimentos</th>
                <th className="text-right p-2 font-medium uppercase tracking-widest text-foreground">Gerou Caixa</th>
                <th className="text-right p-2 font-medium uppercase tracking-widest text-foreground">%</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((month, idx) => {
                const percent = month.count > 0 ? (month.revenue / month.count) * 100 : 0;
                return (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="p-2 capitalize text-foreground">{month.monthFull}</td>
                    <td className="p-2 text-right font-medium text-foreground">{month.count}</td>
                    <td className="p-2 text-right font-medium text-success">{month.revenue}</td>
                    <td className="p-2 text-right text-muted-foreground">
                      {percent.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold">
                <td className="p-2 text-foreground">TOTAL</td>
                <td className="p-2 text-right text-foreground">{annualSummary.totalClients}</td>
                <td className="p-2 text-right text-success">{annualSummary.revenueCases}</td>
                <td className="p-2 text-right text-muted-foreground">
                  {annualSummary.revenuePercent.toFixed(0)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
