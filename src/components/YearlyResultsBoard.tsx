import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { parseISO, getMonth, getYear } from 'date-fns';
import type { Meta } from '@/types';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MonthlyData {
  valorVendido: number;
  contratosFechados: number;
  captacoes: number;
  acoesComEspecificador: number;
}

export function YearlyResultsBoard() {
  const { actions, actionTypes, metas } = useApp();

  // Regra: considerar apenas dados do ano de 2026
  const targetYear = 2026;

  const monthlyData = useMemo(() => {
    const data: MonthlyData[] = Array.from({ length: 12 }, () => ({
      valorVendido: 0,
      contratosFechados: 0,
      captacoes: 0,
      acoesComEspecificador: 0,
    }));

    actions.forEach(action => {
      const actionDate = parseISO(action.date);
      if (getYear(actionDate) !== targetYear) return;

      const monthIndex = getMonth(actionDate);
      const actionType = actionTypes.find(t => t.id === action.actionTypeId);

      // Valor Vendido e Contratos Fechados (classification === 'venda')
      if (actionType?.classification === 'venda') {
        data[monthIndex].valorVendido += action.value || 0;
        data[monthIndex].contratosFechados += 1;
      }

      // Captações: contagem de ações que impactam a meta 'captacao'
      if (actionType?.impactsMetas.includes('captacao')) {
        data[monthIndex].captacoes += 1;
      }

      // Ações com Especificador (tem profissional vinculado)
      if (action.professionalId) {
        data[monthIndex].acoesComEspecificador += 1;
      }
    });

    return data;
  }, [actions, actionTypes, targetYear]);

  // Meta mensal de vendas por mês — soma das metas de vendas ativas, normalizadas para mensal
  const monthlyMeta = useMemo(() => {
    const result = Array.from({ length: 12 }, () => 0);
    const vendasMetas = metas.filter(m => m.type === 'vendas' && m.isActive);

    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthStart = new Date(targetYear, monthIdx, 1);
      const monthEnd = new Date(targetYear, monthIdx + 1, 0);

      vendasMetas.forEach((m: Meta) => {
        const start = m.startDate ? new Date(m.startDate) : null;
        const end = m.endDate ? new Date(m.endDate) : null;
        if (start && start > monthEnd) return;
        if (end && end < monthStart) return;

        switch (m.validityType) {
          case 'mensal': result[monthIdx] += m.value; break;
          case 'trimestral': result[monthIdx] += m.value / 3; break;
          case 'semestral': result[monthIdx] += m.value / 6; break;
          case 'anual': result[monthIdx] += m.value / 12; break;
          case 'personalizada': {
            if (start && end) {
              const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
              if (months > 0) result[monthIdx] += m.value / months;
            } else {
              result[monthIdx] += m.value;
            }
            break;
          }
          default: result[monthIdx] += m.value;
        }
      });
    }
    return result;
  }, [metas, targetYear]);

  const totalMeta = useMemo(() => monthlyMeta.reduce((a, b) => a + b, 0), [monthlyMeta]);

  const calcPct = (executado: number, meta: number) => meta > 0 ? (executado / meta) * 100 : 0;
  const pctClass = (pct: number, hasMeta: boolean) => {
    if (!hasMeta) return 'text-muted-foreground';
    if (pct >= 100) return 'text-green-400';
    if (pct >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const totals = useMemo(() => {
    return monthlyData.reduce(
      (acc, month) => ({
        valorVendido: acc.valorVendido + month.valorVendido,
        contratosFechados: acc.contratosFechados + month.contratosFechados,
        captacoes: acc.captacoes + month.captacoes,
        acoesComEspecificador: acc.acoesComEspecificador + month.acoesComEspecificador,
      }),
      { valorVendido: 0, contratosFechados: 0, captacoes: 0, acoesComEspecificador: 0 }
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
      <h2 className="title-section mb-4">Quadro Mensal de Resultados — {targetYear}</h2>
      
      {/* Desktop View */}
      <div className="card-flat overflow-x-auto hidden lg:block">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b-2 border-foreground/40">
              <th className="table-header text-left p-3 w-32">Indicador</th>
              {MONTH_LABELS.map((month, idx) => (
                <th 
                  key={month} 
                  className={`table-header text-center p-2 text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}
                >
                  {month}
                </th>
              ))}
              <th className="table-header text-center p-2 bg-foreground/10 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Valor Vendido Row */}
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Valor Vendido</td>
              {monthlyData.map((data, idx) => (
                <td 
                  key={idx} 
                  className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/70' : ''}`}
                  title={formatFullCurrency(data.valorVendido)}
                >
                  {formatCurrency(data.valorVendido)}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10" title={formatFullCurrency(totals.valorVendido)}>
                {formatCurrency(totals.valorVendido)}
              </td>
            </tr>

            {/* Ticket Médio Row */}
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Ticket Médio</td>
              {monthlyData.map((data, idx) => {
                const ticketMedio = calcTicketMedio(data.valorVendido, data.contratosFechados);
                return (
                  <td 
                    key={idx} 
                    className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/70' : ''}`}
                     title={formatFullCurrency(ticketMedio)}
                  >
                     {formatCurrency(ticketMedio)}
                  </td>
                );
              })}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10" title={formatFullCurrency(calcTicketMedio(totals.valorVendido, totals.contratosFechados))}>
                {formatCurrency(calcTicketMedio(totals.valorVendido, totals.contratosFechados))}
              </td>
            </tr>

            {/* Captações Row */}
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Captações</td>
              {monthlyData.map((data, idx) => (
                <td 
                  key={idx} 
                  className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/70' : ''}`}
                >
                  {data.captacoes}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10">
                {totals.captacoes}
              </td>
            </tr>

            {/* Ações com Especificador Row */}
            <tr className="border-b-2 border-foreground/40/10 last:border-0">
              <td className="p-3 text-sm font-medium">Ações c/ Especificador</td>
              {monthlyData.map((data, idx) => (
                <td 
                  key={idx} 
                  className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/70' : ''}`}
                >
                  {data.acoesComEspecificador}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10">
                {totals.acoesComEspecificador}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tablet View */}
      <div className="card-flat overflow-x-auto hidden md:block lg:hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-foreground/40">
              <th className="table-header text-left p-3">Indicador</th>
              {MONTH_LABELS.slice(0, 6).map((month, idx) => (
                <th 
                  key={month} 
                  className={`table-header text-center p-2 text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}
                >
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Valor Vendido</td>
              {monthlyData.slice(0, 6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}>
                  {formatCurrency(data.valorVendido)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Ticket Médio</td>
              {monthlyData.slice(0, 6).map((data, idx) => {
                const ticketMedio = calcTicketMedio(data.valorVendido, data.contratosFechados);
                return (
                  <td key={idx} className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}>
                    {formatCurrency(ticketMedio)}
                  </td>
                );
              })}
            </tr>
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Captações</td>
              {monthlyData.slice(0, 6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}>
                  {data.captacoes}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Ações c/ Espec.</td>
              {monthlyData.slice(0, 6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}>
                  {data.acoesComEspecificador}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <table className="w-full mt-4">
          <thead>
            <tr className="border-b-2 border-foreground/40">
              <th className="table-header text-left p-3">Indicador</th>
              {MONTH_LABELS.slice(6).map((month, idx) => (
                <th 
                  key={month} 
                  className={`table-header text-center p-2 text-xs ${(idx + 6) === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}
                >
                  {month}
                </th>
              ))}
              <th className="table-header text-center p-2 bg-foreground/10">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Valor Vendido</td>
              {monthlyData.slice(6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${(idx + 6) === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}>
                  {formatCurrency(data.valorVendido)}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10">{formatCurrency(totals.valorVendido)}</td>
            </tr>
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Ticket Médio</td>
              {monthlyData.slice(6).map((data, idx) => {
                const ticketMedio = calcTicketMedio(data.valorVendido, data.contratosFechados);
                return (
                  <td key={idx} className={`p-2 text-center text-xs ${(idx + 6) === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}>
                    {formatCurrency(ticketMedio)}
                  </td>
                );
              })}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10">
                {formatCurrency(calcTicketMedio(totals.valorVendido, totals.contratosFechados))}
              </td>
            </tr>
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Captações</td>
              {monthlyData.slice(6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${(idx + 6) === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}>
                  {data.captacoes}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10">{totals.captacoes}</td>
            </tr>
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Ações c/ Espec.</td>
              {monthlyData.slice(6).map((data, idx) => (
                <td key={idx} className={`p-2 text-center text-xs ${(idx + 6) === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}>
                  {data.acoesComEspecificador}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10">{totals.acoesComEspecificador}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile View - Cards */}
      <div className="space-y-4 md:hidden">
        {/* Summary Card */}
        <div className="card-flat">
          <h3 className="text-xs tracking-widest uppercase text-muted-foreground mb-3">Acumulado {targetYear}</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{formatCurrency(totals.valorVendido)}</p>
              <p className="text-xs text-muted-foreground">Valor Vendido</p>
            </div>
            <div>
              <p className="text-lg font-bold">
                {formatCurrency(calcTicketMedio(totals.valorVendido, totals.contratosFechados))}
              </p>
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
            </div>
            <div>
              <p className="text-lg font-bold">{totals.captacoes}</p>
              <p className="text-xs text-muted-foreground">Captações</p>
            </div>
            <div>
              <p className="text-lg font-bold">{totals.acoesComEspecificador}</p>
              <p className="text-xs text-muted-foreground">Ações c/ Espec.</p>
            </div>
          </div>
        </div>

        {/* Monthly Cards */}
        <div className="grid grid-cols-2 gap-3">
          {monthlyData.map((data, idx) => {
            const ticketMedio = calcTicketMedio(data.valorVendido, data.contratosFechados);
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
                    <span className="text-muted-foreground">Valor Vendido</span>
                    <span>{formatCurrency(data.valorVendido)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket Médio</span>
                    <span>{formatCurrency(ticketMedio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Captações</span>
                    <span>{data.captacoes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ações c/ Espec.</span>
                    <span>{data.acoesComEspecificador}</span>
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
