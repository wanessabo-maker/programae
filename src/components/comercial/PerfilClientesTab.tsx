/**
 * PerfilClientesTab
 *
 * Substitui o antigo ClientesTab com análise real de conversão.
 *
 * Responde as perguntas da gestora:
 * - Qual perfil de cliente tem maior probabilidade de fechar?
 * - Quantas apresentações são necessárias por perfil?
 * - Quais especificadores indicam os melhores clientes?
 * - Quais consultores convertem melhor cada perfil?
 *
 * Fonte dos dados:
 * - clients.age, clients.profession (capturados na Apresentação de Projeto)
 * - actions.presentation_number (nº da apresentação)
 * - projects.stage (em_negociacao / closed_won / closed_lost)
 * - professionals (especificadores) vinculados aos clientes
 * - team_members (consultores) responsáveis pelos projetos
 */

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useApp } from '@/contexts/AppContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

const AGE_BUCKETS = ['18-25', '26-35', '36-45', '46-55', '56+'] as const;
type AgeBucket = typeof AGE_BUCKETS[number];

function getAgeBucket(age: number | null | undefined): AgeBucket | null {
  if (age == null) return null;
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  return '56+';
}

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 100);
}

function fmtPct(n: number): string {
  return `${n}%`;
}

// ── Tipos internos ────────────────────────────────────────────────────────────

interface ConversionRow {
  label: string;
  total: number;
  fechados: number;
  perdidos: number;
  negociacao: number;
  taxaFechamento: number; // %
  avgApresentacoes: number;
  ticketMedio: number;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PerfilClientesTab() {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { actions, actionTypes, professionals, teamMembers } = useApp();

  const [viewMode, setViewMode] = useState<'idade' | 'profissao' | 'especificador' | 'consultor'>('idade');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const isLoading = clientsLoading || projectsLoading;

  // IDs dos tipos de ação "Apresentação de Projeto" (comercial)
  const apresentacaoTypeIds = useMemo(() => new Set(
    actionTypes
      .filter(t => normalizeText(t.name || '').includes('apresentacao de projeto'))
      .map(t => t.id)
  ), [actionTypes]);

  // Map clientId → { apresentacoes, apresentacaoNumbers, consultorId }
  const clientActionData = useMemo(() => {
    const map = new Map<string, {
      apresentacoes: number;
      maxApresentacao: number;
      consultorId: string | null;
    }>();

    actions.forEach(a => {
      if (!apresentacaoTypeIds.has(a.actionTypeId)) return;
      const project = projects.find(p => p.id === a.projectId);
      const clientId = project?.client_id;
      if (!clientId) return;

      const existing = map.get(clientId) || { apresentacoes: 0, maxApresentacao: 0, consultorId: null };
      const num = typeof a.presentationNumber === 'string'
        ? parseInt(a.presentationNumber, 10)
        : (a.presentationNumber || 0);

      map.set(clientId, {
        apresentacoes: existing.apresentacoes + 1,
        maxApresentacao: Math.max(existing.maxApresentacao, isNaN(num) ? 0 : num),
        consultorId: existing.consultorId || a.consultantId,
      });
    });

    return map;
  }, [actions, apresentacaoTypeIds, projects]);

  // Map clientId → project (para stage e closed_value)
  const clientProject = useMemo(() => {
    const map = new Map<string, typeof projects[0]>();
    projects.forEach(p => {
      if (p.client_id) map.set(p.client_id, p);
    });
    return map;
  }, [projects]);

  // Enriquecer clientes com dados de conversão
  const enrichedClients = useMemo(() => {
    return clients.map(c => {
      const project = clientProject.get(c.id);
      const actionData = clientActionData.get(c.id);
      return {
        ...c,
        stage: project?.stage || 'em_negociacao',
        closedValue: project?.closed_value || project?.estimated_value || 0,
        apresentacoes: actionData?.maxApresentacao || 0,
        consultorId: actionData?.consultorId || project?.responsible_id || null,
        profissionalId: project?.professional_id || null,
      };
    });
  }, [clients, clientProject, clientActionData]);

  // KPIs gerais
  const kpis = useMemo(() => {
    const total = enrichedClients.length;
    const fechados = enrichedClients.filter(c => c.stage === 'closed_won').length;
    const perdidos = enrichedClients.filter(c => c.stage === 'closed_lost').length;
    const negociacao = enrichedClients.filter(c => c.stage === 'em_negociacao').length;
    const taxaGeral = pct(fechados, total);
    const ticketMedio = fechados > 0
      ? enrichedClients
          .filter(c => c.stage === 'closed_won')
          .reduce((s, c) => s + c.closedValue, 0) / fechados
      : 0;
    const avgApresentacoes = fechados > 0
      ? enrichedClients
          .filter(c => c.stage === 'closed_won' && c.apresentacoes > 0)
          .reduce((s, c) => s + c.apresentacoes, 0) /
        enrichedClients.filter(c => c.stage === 'closed_won' && c.apresentacoes > 0).length
      : 0;

    return { total, fechados, perdidos, negociacao, taxaGeral, ticketMedio, avgApresentacoes };
  }, [enrichedClients]);

  // Builder genérico de linhas de conversão por agrupador
  function buildRows(groupFn: (c: typeof enrichedClients[0]) => string | null): ConversionRow[] {
    const groups = new Map<string, typeof enrichedClients>();
    enrichedClients.forEach(c => {
      const key = groupFn(c);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });

    return Array.from(groups.entries())
      .map(([label, list]) => {
        const fechados = list.filter(c => c.stage === 'closed_won');
        const perdidos = list.filter(c => c.stage === 'closed_lost');
        const negociacao = list.filter(c => c.stage === 'em_negociacao');
        const ticketMedio = fechados.length > 0
          ? fechados.reduce((s, c) => s + c.closedValue, 0) / fechados.length
          : 0;
        const comApresentacao = fechados.filter(c => c.apresentacoes > 0);
        const avgApresentacoes = comApresentacao.length > 0
          ? comApresentacao.reduce((s, c) => s + c.apresentacoes, 0) / comApresentacao.length
          : 0;

        return {
          label,
          total: list.length,
          fechados: fechados.length,
          perdidos: perdidos.length,
          negociacao: negociacao.length,
          taxaFechamento: pct(fechados.length, list.length),
          avgApresentacoes,
          ticketMedio,
        };
      })
      .filter(r => r.total >= 1)
      .sort((a, b) => b.taxaFechamento - a.taxaFechamento);
  }

  // Dados por view
  const rows = useMemo((): ConversionRow[] => {
    if (viewMode === 'idade') {
      return buildRows(c => getAgeBucket(c.age));
    }
    if (viewMode === 'profissao') {
      return buildRows(c => c.profession?.trim() || null);
    }
    if (viewMode === 'especificador') {
      return buildRows(c => {
        const prof = professionals.find(p => p.id === c.profissionalId);
        return prof?.name || null;
      });
    }
    if (viewMode === 'consultor') {
      return buildRows(c => {
        const member = teamMembers.find(m => m.id === c.consultorId);
        return member?.name || null;
      });
    }
    return [];
  }, [viewMode, enrichedClients, professionals, teamMembers]);

  // Taxa de fechamento média geral (para referência visual)
  const taxaMedia = kpis.taxaGeral;

  if (isLoading) {
    return <div className="py-8 text-center text-xs text-muted-foreground tracking-widest uppercase">Carregando...</div>;
  }

  return (
    <div className="space-y-6">

      {/* ── KPIs gerais ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de clientes', value: kpis.total, sub: '' },
          { label: 'Taxa de fechamento', value: `${kpis.taxaGeral}%`, sub: `${kpis.fechados} fechados` },
          {
            label: 'Ticket médio',
            value: kpis.ticketMedio > 0
              ? kpis.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
              : '—',
            sub: 'nos vendidos',
          },
          {
            label: 'Apres. média p/ fechar',
            value: kpis.avgApresentacoes > 0 ? kpis.avgApresentacoes.toFixed(1) : '—',
            sub: 'nos que fecharam',
          },
        ].map(({ label, value, sub }) => (
          <div key={label} className="border border-border p-4">
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">{label}</div>
            <div className="text-2xl font-light tabular-nums">{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Seletor de dimensão ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] tracking-widest uppercase text-muted-foreground mr-2">Analisar por:</span>
        {([
          { key: 'idade', label: 'Faixa etária' },
          { key: 'profissao', label: 'Profissão' },
          { key: 'especificador', label: 'Especificador' },
          { key: 'consultor', label: 'Consultor' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setViewMode(key); setExpandedRow(null); }}
            className={`px-3 py-1.5 text-xs border transition-colors ${
              viewMode === key
                ? 'bg-foreground text-background border-foreground'
                : 'border-border hover:border-foreground/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tabela de conversão ───────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Sem dados suficientes para este agrupamento ainda.
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-3 text-[10px] tracking-widest uppercase text-muted-foreground">
                  {viewMode === 'idade' ? 'Faixa etária' :
                   viewMode === 'profissao' ? 'Profissão' :
                   viewMode === 'especificador' ? 'Especificador' : 'Consultor'}
                </th>
                <th className="text-center p-3 text-[10px] tracking-widest uppercase text-muted-foreground">Total</th>
                <th className="text-center p-3 text-[10px] tracking-widest uppercase text-muted-foreground">Fechados</th>
                <th className="text-center p-3 text-[10px] tracking-widest uppercase text-muted-foreground">Perdidos</th>
                <th className="text-center p-3 text-[10px] tracking-widest uppercase text-muted-foreground">Negociação</th>
                <th className="p-3 text-[10px] tracking-widest uppercase text-muted-foreground min-w-[160px]">Taxa fechamento</th>
                <th className="text-center p-3 text-[10px] tracking-widest uppercase text-muted-foreground">Apres. média</th>
                <th className="text-right p-3 text-[10px] tracking-widest uppercase text-muted-foreground">Ticket médio</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isAboveAvg = row.taxaFechamento >= taxaMedia;
                const isExpanded = expandedRow === row.label;
                const barWidth = Math.max(2, row.taxaFechamento);

                return (
                  <>
                    <tr
                      key={row.label}
                      className="border-b border-border/50 hover:bg-muted/10 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(isExpanded ? null : row.label)}
                    >
                      {/* Label */}
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-2">
                          {isAboveAvg
                            ? <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            : <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          }
                          {row.label}
                          {viewMode === 'idade' && <span className="text-muted-foreground font-normal text-xs">anos</span>}
                        </div>
                      </td>

                      {/* Counts */}
                      <td className="p-3 text-center tabular-nums">{row.total}</td>
                      <td className="p-3 text-center tabular-nums text-green-600 font-medium">{row.fechados}</td>
                      <td className="p-3 text-center tabular-nums text-red-400">{row.perdidos}</td>
                      <td className="p-3 text-center tabular-nums text-orange-400">{row.negociacao}</td>

                      {/* Taxa com barra visual */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted overflow-hidden rounded-sm">
                            <div
                              className={`h-full rounded-sm transition-all ${
                                isAboveAvg ? 'bg-green-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium tabular-nums min-w-[36px] text-right ${
                            isAboveAvg ? 'text-green-600' : 'text-red-400'
                          }`}>
                            {fmtPct(row.taxaFechamento)}
                          </span>
                        </div>
                        {/* Linha de média para referência */}
                        {Math.abs(row.taxaFechamento - taxaMedia) > 5 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {isAboveAvg
                              ? `+${row.taxaFechamento - taxaMedia}pp acima da média`
                              : `${row.taxaFechamento - taxaMedia}pp abaixo da média`}
                          </div>
                        )}
                      </td>

                      {/* Média de apresentações */}
                      <td className="p-3 text-center tabular-nums text-xs">
                        {row.avgApresentacoes > 0 ? row.avgApresentacoes.toFixed(1) : '—'}
                      </td>

                      {/* Ticket médio */}
                      <td className="p-3 text-right tabular-nums text-xs">
                        {row.ticketMedio > 0
                          ? row.ticketMedio.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              maximumFractionDigits: 0,
                            })
                          : '—'}
                      </td>

                      {/* Expand */}
                      <td className="p-3 text-center text-muted-foreground">
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5" />
                          : <ChevronDown className="w-3.5 h-3.5" />
                        }
                      </td>
                    </tr>

                    {/* Linha expandida — insight contextual */}
                    {isExpanded && (
                      <tr key={`${row.label}-expanded`} className="bg-muted/10 border-b border-border/50">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium text-foreground">Taxa de fechamento:</span>{' '}
                              {fmtPct(row.taxaFechamento)} vs média geral de {fmtPct(taxaMedia)}
                              {' '}({isAboveAvg ? '+' : ''}{row.taxaFechamento - taxaMedia}pp)
                            </div>
                            {row.avgApresentacoes > 0 && (
                              <div>
                                <span className="font-medium text-foreground">Apresentações para fechar:</span>{' '}
                                em média {row.avgApresentacoes.toFixed(1)} apresentações
                              </div>
                            )}
                            {row.ticketMedio > 0 && (
                              <div>
                                <span className="font-medium text-foreground">Ticket médio:</span>{' '}
                                {row.ticketMedio.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                  maximumFractionDigits: 0,
                                })}
                              </div>
                            )}
                            {row.negociacao > 0 && (
                              <div>
                                <span className="font-medium text-foreground">Em negociação:</span>{' '}
                                {row.negociacao} cliente(s) ainda em aberto neste perfil
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          {/* Rodapé com legenda */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-border bg-muted/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-green-500" />
              Acima da média geral ({fmtPct(taxaMedia)})
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingDown className="w-3 h-3 text-red-400" />
              Abaixo da média geral
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              Clique em uma linha para ver o detalhamento
            </div>
          </div>
        </div>
      )}

      {/* ── Nota sobre dados ─────────────────────────────────────────────── */}
      <div className="text-xs text-muted-foreground bg-muted/30 px-4 py-3 border border-border/50">
        Os dados de perfil (idade e profissão) são capturados quando o consultor registra a ação de{' '}
        <span className="font-medium text-foreground">Apresentação de Projeto</span>.
        Quanto mais completo o preenchimento, mais precisa a análise.
      </div>

    </div>
  );
}
