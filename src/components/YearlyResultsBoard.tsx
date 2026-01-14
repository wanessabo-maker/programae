import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { parseISO, getMonth, getYear } from 'date-fns';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MonthlyData {
  sales: number;
  actions: number;
  projects: number;
}

export function YearlyResultsBoard() {
  const { actions, actionTypes } = useApp();

  const currentYear = new Date().getFullYear();

  const monthlyData = useMemo(() => {
    const data: MonthlyData[] = Array.from({ length: 12 }, () => ({
      sales: 0,
      actions: 0,
      projects: 0,
    }));

    actions.forEach(action => {
      const actionDate = parseISO(action.date);
      if (getYear(actionDate) !== currentYear) return;

      const monthIndex = getMonth(actionDate);
      const actionType = actionTypes.find(t => t.id === action.actionTypeId);

      // Count action
      data[monthIndex].actions += 1;

      // Sales value (classification === 'venda')
      if (actionType?.classification === 'venda') {
        data[monthIndex].sales += action.value || 0;
      }

      // Projects (impacts includes 'projeto')
      if (actionType?.impactsMetas.includes('projeto')) {
        data[monthIndex].projects += action.value || 1;
      }
    });

    return data;
  }, [actions, actionTypes, currentYear]);

  const totals = useMemo(() => {
    return monthlyData.reduce(
      (acc, month) => ({
        sales: acc.sales + month.sales,
        actions: acc.actions + month.actions,
        projects: acc.projects + month.projects,
      }),
      { sales: 0, actions: 0, projects: 0 }
    );
  }, [monthlyData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const currentMonth = new Date().getMonth();

  return (
    <section>
      <h2 className="title-section mb-4">Quadro Mensal de Resultados — {currentYear}</h2>
      
      {/* Desktop View */}
      <div className="card-flat overflow-x-auto hidden lg:block">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-black">
              <th className="table-header text-left p-3 w-32">Indicador</th>
              {MONTH_LABELS.map((month, idx) => (
                <th 
                  key={month} 
                  className={`table-header text-center p-2 text-xs ${idx === currentMonth ? 'bg-primary/10' : ''}`}
                >
                  {month}
                </th>
              ))}
              <th className="table-header text-center p-2 bg-muted font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Sales Row */}
            <tr className="border-b border-black/10">
              <td className="p-3 text-sm font-medium">Vendas (R$)</td>
              {monthlyData.map((data, idx) => (
                <td 
                  key={idx} 
                  className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/50' : ''}`}
                  title={formatFullCurrency(data.sales)}
                >
                  {data.sales > 0 ? formatCurrency(data.sales) : '-'}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-muted" title={formatFullCurrency(totals.sales)}>
                {formatCurrency(totals.sales)}
              </td>
            </tr>

            {/* Actions Row */}
            <tr className="border-b border-black/10">
              <td className="p-3 text-sm font-medium">Ações (qtd)</td>
              {monthlyData.map((data, idx) => (
                <td 
                  key={idx} 
                  className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/50' : ''}`}
                >
                  {data.actions > 0 ? data.actions : '-'}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-muted">
                {totals.actions}
              </td>
            </tr>

            {/* Projects Row */}
            <tr className="border-b border-black/10 last:border-0">
              <td className="p-3 text-sm font-medium">Projetos (qtd)</td>
              {monthlyData.map((data, idx) => (
                <td 
                  key={idx} 
                  className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/50' : ''}`}
                >
                  {data.projects > 0 ? data.projects : '-'}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-muted">
                {totals.projects}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tablet View */}
      <div className="card-flat overflow-x-auto hidden md:block lg:hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black">
              <th className="table-header text-left p-3">Indicador</th>
              {MONTH_LABELS.slice(0, 6).map((month, idx) => (
                <th 
                  key={month} 
                  className={`table-header text-center p-2 text-xs ${idx === currentMonth ? 'bg-primary/10' : ''}`}
                >
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black/10">
              <td className="p-3 text-sm font-medium">Vendas</td>
              {monthlyData.slice(0, 6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10' : ''}`}>
                  {data.sales > 0 ? formatCurrency(data.sales) : '-'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-black/10">
              <td className="p-3 text-sm font-medium">Ações</td>
              {monthlyData.slice(0, 6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10' : ''}`}>
                  {data.actions > 0 ? data.actions : '-'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-black/10">
              <td className="p-3 text-sm font-medium">Projetos</td>
              {monthlyData.slice(0, 6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/10' : ''}`}>
                  {data.projects > 0 ? data.projects : '-'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <table className="w-full mt-4">
          <thead>
            <tr className="border-b border-black">
              <th className="table-header text-left p-3">Indicador</th>
              {MONTH_LABELS.slice(6).map((month, idx) => (
                <th 
                  key={month} 
                  className={`table-header text-center p-2 text-xs ${(idx + 6) === currentMonth ? 'bg-primary/10' : ''}`}
                >
                  {month}
                </th>
              ))}
              <th className="table-header text-center p-2 bg-muted">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black/10">
              <td className="p-3 text-sm font-medium">Vendas</td>
              {monthlyData.slice(6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${(idx + 6) === currentMonth ? 'bg-primary/10' : ''}`}>
                  {data.sales > 0 ? formatCurrency(data.sales) : '-'}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-muted">{formatCurrency(totals.sales)}</td>
            </tr>
            <tr className="border-b border-black/10">
              <td className="p-3 text-sm font-medium">Ações</td>
              {monthlyData.slice(6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${(idx + 6) === currentMonth ? 'bg-primary/10' : ''}`}>
                  {data.actions > 0 ? data.actions : '-'}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-muted">{totals.actions}</td>
            </tr>
            <tr className="border-b border-black/10">
              <td className="p-3 text-sm font-medium">Projetos</td>
              {monthlyData.slice(6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${(idx + 6) === currentMonth ? 'bg-primary/10' : ''}`}>
                  {data.projects > 0 ? data.projects : '-'}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-muted">{totals.projects}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile View - Cards */}
      <div className="space-y-4 md:hidden">
        {/* Summary Card */}
        <div className="card-flat">
          <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-3">Acumulado {currentYear}</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{formatCurrency(totals.sales)}</p>
              <p className="text-xs text-muted-foreground">Vendas</p>
            </div>
            <div>
              <p className="text-lg font-bold">{totals.actions}</p>
              <p className="text-xs text-muted-foreground">Ações</p>
            </div>
            <div>
              <p className="text-lg font-bold">{totals.projects}</p>
              <p className="text-xs text-muted-foreground">Projetos</p>
            </div>
          </div>
        </div>

        {/* Monthly Cards - Only months with data or current/past months */}
        <div className="grid grid-cols-2 gap-3">
          {monthlyData.map((data, idx) => {
            if (idx > currentMonth && data.sales === 0 && data.actions === 0 && data.projects === 0) {
              return null;
            }
            return (
              <div 
                key={idx} 
                className={`card-flat ${idx === currentMonth ? 'ring-1 ring-primary' : ''}`}
              >
                <h4 className={`text-xs font-medium mb-2 ${idx === currentMonth ? 'text-primary' : 'text-muted-foreground'}`}>
                  {MONTH_LABELS[idx]}
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendas</span>
                    <span>{data.sales > 0 ? formatCurrency(data.sales) : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ações</span>
                    <span>{data.actions || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projetos</span>
                    <span>{data.projects || '-'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
