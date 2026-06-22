import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { parseISO, getMonth, getYear } from 'date-fns';
import type { Meta } from '@/types';
import { useEngenhariaMembers } from '@/hooks/useEngenhariaMembers';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MonthlyData {
  valorVendido: number;
  contratosFechados: number;
  captacoes: number;
  acoesComEspecificador: number;
  valorVendidoEng: number;
}

export function YearlyResultsBoard() {
  const { actions, actionTypes, metas } = useApp();
  const { engOnlyMemberIds, isEngenhariaConsultant } = useEngenhariaMembers();

  // Regra: considerar apenas dados do ano de 2026
  const targetYear = 2026;

  const monthlyData = useMemo(() => {
    const data: MonthlyData[] = Array.from({ length: 12 }, () => ({
      valorVendido: 0,
      contratosFechados: 0,
      captacoes: 0,
      acoesComEspecificador: 0,
      valorVendidoEng: 0,
    }));

    actions.forEach(action => {
      const actionDate = parseISO(action.date);
      if (getYear(actionDate) !== targetYear) return;

      const monthIndex = getMonth(actionDate);
      const actionType = actionTypes.find(t => t.id === action.actionTypeId);

      // Valor Vendido e Contratos Fechados (classification === 'venda')
      if (actionType?.classification === 'venda') {
        const isEng = isEngenhariaConsultant(action.consultantId, action.salesChannel ?? null);
        if (isEng) {
          data[monthIndex].valorVendidoEng += action.value || 0;
        } else {
          data[monthIndex].valorVendido += action.value || 0;
        }
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
  }, [actions, actionTypes, targetYear, isEngenhariaConsultant]);

  // Meta mensal de vendas por mês — soma das metas de vendas ativas, normalizadas para mensal
  const buildMonthlyMeta = (filter: (m: Meta) => boolean) => {
    const result = Array.from({ length: 12 }, () => 0);
    const vendasMetas = metas.filter(m => m.type === 'vendas' && m.isActive && filter(m));

    // Parse 'YYYY-MM-DD' como data LOCAL (evita shift de UTC para timezones negativos)
    const parseLocalDate = (s: string | null | undefined): Date | null => {
      if (!s) return null;
      const onlyDate = s.length >= 10 ? s.slice(0, 10) : s;
      const [y, mo, d] = onlyDate.split('-').map(Number);
      if (!y || !mo || !d) return null;
      return new Date(y, mo - 1, d);
    };

    const daysBetween = (a: Date, b: Date) =>
      Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);

    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthStart = new Date(targetYear, monthIdx, 1);
      const monthEnd = new Date(targetYear, monthIdx + 1, 0);

      vendasMetas.forEach((m: Meta) => {
        const start = parseLocalDate(m.startDate as unknown as string);
        let end = parseLocalDate(m.endDate as unknown as string);
        // Normalização: endDate no dia 1 = intervalo semi-aberto (exclusivo).
        // Ex.: 01/03 → 01/04 representa "março inteiro". Convertemos para o
        // último dia do mês anterior (inclusivo).
        if (end && start && end.getDate() === 1 && end.getTime() !== start.getTime()) {
          end = new Date(end.getTime() - 86400000);
        }
        if (start && start > monthEnd) return;
        if (end && end < monthStart) return;

        switch (m.validityType) {
          case 'mensal': {
            // Meta mensal: aplica valor cheio se há sobreposição com o mês
            if (start && end) {
              const overlapStart = start > monthStart ? start : monthStart;
              const overlapEnd = end < monthEnd ? end : monthEnd;
              if (overlapStart <= overlapEnd) result[monthIdx] += m.value;
            } else {
              result[monthIdx] += m.value;
            }
            break;
          }
          case 'trimestral':
          case 'semestral':
          case 'anual':
          case 'personalizada': {
            if (start && end) {
              const totalDays = daysBetween(start, end);
              const overlapStart = start > monthStart ? start : monthStart;
              const overlapEnd = end < monthEnd ? end : monthEnd;
              const overlapDays = daysBetween(overlapStart, overlapEnd);
              if (totalDays > 0 && overlapDays > 0) {
                // Se a meta cabe inteira em um único mês-calendário, aplica valor cheio.
                const startMonthKey = start.getFullYear() * 12 + start.getMonth();
                const endMonthKey = end.getFullYear() * 12 + end.getMonth();
                if (startMonthKey === endMonthKey) {
                  result[monthIdx] += m.value;
                } else {
                  result[monthIdx] += m.value * (overlapDays / totalDays);
                }
              }
            } else {
              const divisor = m.validityType === 'trimestral' ? 3
                : m.validityType === 'semestral' ? 6
                : m.validityType === 'anual' ? 12 : 1;
              result[monthIdx] += m.value / divisor;
            }
            break;
          }
          default: result[monthIdx] += m.value;
        }
      });
    }
    return result;
  };

  const monthlyMeta = useMemo(
    () => buildMonthlyMeta((m) => !(
      m.salesChannel === 'engenharia' ||
      (!m.salesChannel && !!m.teamMemberId && engOnlyMemberIds.has(m.teamMemberId))
    )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metas, targetYear, engOnlyMemberIds]
  );

  const monthlyMetaEng = useMemo(
    () => buildMonthlyMeta((m) => (
      m.salesChannel === 'engenharia' ||
      (!m.salesChannel && !!m.teamMemberId && engOnlyMemberIds.has(m.teamMemberId))
    )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metas, targetYear, engOnlyMemberIds]
  );

  const totalMeta = useMemo(() => monthlyMeta.reduce((a, b) => a + b, 0), [monthlyMeta]);
  const totalMetaEng = useMemo(() => monthlyMetaEng.reduce((a, b) => a + b, 0), [monthlyMetaEng]);

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
        valorVendidoEng: acc.valorVendidoEng + month.valorVendidoEng,
      }),
      { valorVendido: 0, contratosFechados: 0, captacoes: 0, acoesComEspecificador: 0, valorVendidoEng: 0 }
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
            {/* Meta Vendas Row */}
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">Meta Vendas</td>
              {monthlyMeta.map((meta, idx) => (
                <td
                  key={idx}
                  className={`p-2 text-center text-xs text-muted-foreground ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}
                  title={formatFullCurrency(meta)}
                >
                  {meta > 0 ? formatCurrency(meta) : '—'}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10 text-muted-foreground" title={formatFullCurrency(totalMeta)}>
                {totalMeta > 0 ? formatCurrency(totalMeta) : '—'}
              </td>
            </tr>

            {/* % da Meta Row */}
            <tr className="border-b-2 border-foreground/40/10">
              <td className="p-3 text-sm font-medium">% da Meta</td>
              {monthlyData.map((data, idx) => {
                const meta = monthlyMeta[idx];
                const pct = calcPct(data.valorVendido, meta);
                return (
                  <td
                    key={idx}
                    className={`p-2 text-center text-xs font-medium ${pctClass(pct, meta > 0)} ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}
                  >
                    {meta > 0 ? `${pct.toFixed(0)}%` : '—'}
                  </td>
                );
              })}
              <td className={`p-2 text-center text-sm font-bold bg-foreground/10 ${pctClass(calcPct(totals.valorVendido, totalMeta), totalMeta > 0)}`}>
                {totalMeta > 0 ? `${calcPct(totals.valorVendido, totalMeta).toFixed(0)}%` : '—'}
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
            {/* Valor Vendido — Engenharia */}
            <tr className="border-b-2 border-foreground/40/10 bg-foreground/[0.03]">
              <td className="p-3 text-sm font-medium">Valor Vendido — Engenharia</td>
              {monthlyData.map((data, idx) => (
                <td
                  key={idx}
                  className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40 font-medium' : ''} ${idx > currentMonth ? 'text-muted-foreground/70' : ''}`}
                  title={formatFullCurrency(data.valorVendidoEng)}
                >
                  {formatCurrency(data.valorVendidoEng)}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10" title={formatFullCurrency(totals.valorVendidoEng)}>
                {formatCurrency(totals.valorVendidoEng)}
              </td>
            </tr>

            {/* Meta Vendas — Engenharia */}
            <tr className="border-b-2 border-foreground/40/10 bg-foreground/[0.03]">
              <td className="p-3 text-sm font-medium">Meta Vendas — Engenharia</td>
              {monthlyMetaEng.map((meta, idx) => (
                <td
                  key={idx}
                  className={`p-2 text-center text-xs text-muted-foreground ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}
                  title={formatFullCurrency(meta)}
                >
                  {meta > 0 ? formatCurrency(meta) : '—'}
                </td>
              ))}
              <td className="p-2 text-center text-sm font-bold bg-foreground/10 text-muted-foreground" title={formatFullCurrency(totalMetaEng)}>
                {totalMetaEng > 0 ? formatCurrency(totalMetaEng) : '—'}
              </td>
            </tr>

            {/* % Meta — Engenharia */}
            <tr className="border-b-2 border-foreground/40/10 bg-foreground/[0.03]">
              <td className="p-3 text-sm font-medium">% Meta — Engenharia</td>
              {monthlyData.map((data, idx) => {
                const meta = monthlyMetaEng[idx];
                const pct = calcPct(data.valorVendidoEng, meta);
                return (
                  <td
                    key={idx}
                    className={`p-2 text-center text-xs font-medium ${pctClass(pct, meta > 0)} ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''}`}
                  >
                    {meta > 0 ? `${pct.toFixed(0)}%` : '—'}
                  </td>
                );
              })}
              <td className={`p-2 text-center text-sm font-bold bg-foreground/10 ${pctClass(calcPct(totals.valorVendidoEng, totalMetaEng), totalMetaEng > 0)}`}>
                {totalMetaEng > 0 ? `${calcPct(totals.valorVendidoEng, totalMetaEng).toFixed(0)}%` : '—'}
              </td>
            </tr>

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
              <td className="p-3 text-sm font-medium">Meta / %</td>
              {monthlyMeta.slice(0, 6).map((meta, idx) => {
                const pct = calcPct(monthlyData[idx].valorVendido, meta);
                return (
                  <td key={idx} className={`p-2 text-center text-xs ${idx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''} ${pctClass(pct, meta > 0)}`}>
                    {meta > 0 ? `${pct.toFixed(0)}%` : '—'}
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
              <td className="p-3 text-sm font-medium">Meta / %</td>
              {monthlyMeta.slice(6).map((meta, idx) => {
                const realIdx = idx + 6;
                const pct = calcPct(monthlyData[realIdx].valorVendido, meta);
                return (
                  <td key={idx} className={`p-2 text-center text-xs ${realIdx === currentMonth ? 'bg-primary/25 ring-1 ring-primary/40' : ''} ${pctClass(pct, meta > 0)}`}>
                    {meta > 0 ? `${pct.toFixed(0)}%` : '—'}
                  </td>
                );
              })}
              <td className={`p-2 text-center text-sm font-bold bg-foreground/10 ${pctClass(calcPct(totals.valorVendido, totalMeta), totalMeta > 0)}`}>
                {totalMeta > 0 ? `${calcPct(totals.valorVendido, totalMeta).toFixed(0)}%` : '—'}
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
                {totalMeta > 0 ? `${calcPct(totals.valorVendido, totalMeta).toFixed(0)}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">% da Meta</p>
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
            const meta = monthlyMeta[idx];
            const pct = calcPct(data.valorVendido, meta);
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
                    <span className="text-muted-foreground">Meta</span>
                    <span>{meta > 0 ? formatCurrency(meta) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">% Meta</span>
                    <span className={pctClass(pct, meta > 0)}>{meta > 0 ? `${pct.toFixed(0)}%` : '—'}</span>
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
