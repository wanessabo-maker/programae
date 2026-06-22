/**
 * MetasTab — Cadastro rápido de metas em massa
 *
 * MELHORIA: Substitui o formulário antigo (uma meta por vez) por uma
 * interface estilo planilha onde você vê todos os colaboradores de uma
 * área ao mesmo tempo e preenche os valores em linha.
 *
 * Fluxo novo:
 *   1. Selecionar mês/período no topo
 *   2. Selecionar a área (aba)
 *   3. Preencher os valores diretamente na linha de cada consultor
 *   4. Clicar "Salvar tudo" — todas as metas são criadas/atualizadas de uma vez
 *
 * Para usar: substituir a função MetasTab dentro de SetupModal.tsx
 * (a função começa na linha ~136 do original)
 *
 * Importar no topo do SetupModal.tsx:
 *   import { MetasTab } from '@/components/setup/MetasTab';
 * E substituir <MetasTab /> dentro do TabsContent value="metas"
 */

import { useState, useMemo, useCallback } from 'react';
import { Check, Copy, ChevronLeft, ChevronRight, Loader2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { usePositions } from '@/hooks/usePositions';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ── Tipos internos ────────────────────────────────────────────────────────────

type MetaType = 'vendas' | 'captacao' | 'acoes' | 'projeto';

// Coluna dinâmica da tabela: meta clássica OU meta de % por categoria de especificador
type ColunaMeta =
  | { kind: 'meta'; key: string; tipo: MetaType; label: string; placeholder: string; isCurrency?: boolean }
  | { kind: 'categoria'; key: string; categoryId: string; label: string; fullLabel: string; placeholder: string };

interface LinhaConsultor {
  memberId: string;
  memberName: string;
  valores: Record<string, string>; // string para edição no input — key = coluna.key
  metasExistentes: Record<string, string | null>; // id da meta existente ou null
  modificado: boolean;
}

const TIPO_LABELS: Record<MetaType, { label: string; prefixo?: string; placeholder: string }> = {
  vendas:    { label: 'Vendas (R$)',    prefixo: 'R$', placeholder: '0,00' },
  captacao:  { label: 'Captações',                    placeholder: '0' },
  acoes:     { label: 'Ações',                        placeholder: '0' },
  projeto:   { label: 'Ambientes',                    placeholder: '0' },
};

const TIPOS: MetaType[] = ['vendas', 'captacao', 'acoes', 'projeto'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseBRL(value: string): number {
  // Aceita "1500", "1.500", "1.500,00", "1500.00"
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function MetasTab() {
  const { metas, areas, teamMembers, professionalCategories, addMeta, updateMeta, deleteMeta } = useApp();
  const { getMemberAreaIds } = usePositions();

  // Mês de referência (padrão: mês atual)
  const [refDate, setRefDate] = useState(() => new Date());
  const [areaId, setAreaId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const mesLabel = format(refDate, "MMMM 'de' yyyy", { locale: ptBR });
  const mesStart = formatLocalDate(startOfMonth(refDate));
  const mesEnd   = formatLocalDate(endOfMonth(refDate));

  // Área selecionada é Comercial? → habilita colunas de % por categoria de especificador
  const isAreaComercial = useMemo(() => {
    const a = areas.find(x => x.id === areaId);
    return !!a && /comercial/i.test(a.name);
  }, [areas, areaId]);

  // Categorias ordenadas (ENCANTADO, CURIOSO, DISTANTE, …)
  const categoriasOrdenadas = useMemo(() => {
    const ordem = ['ENCANTADO', 'CURIOSO', 'DISTANTE'];
    return [...professionalCategories].sort((a, b) => {
      const ai = ordem.indexOf(a.name.toUpperCase());
      const bi = ordem.indexOf(b.name.toUpperCase());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [professionalCategories]);

  // Colunas da tabela: clássicas + (se Comercial) % por categoria
  const colunas = useMemo<ColunaMeta[]>(() => {
    const base: ColunaMeta[] = TIPOS.map(t => ({
      kind: 'meta',
      key: t,
      tipo: t,
      label: TIPO_LABELS[t].label,
      placeholder: TIPO_LABELS[t].placeholder,
      isCurrency: t === 'vendas',
    }));
    if (!isAreaComercial) return base;
    const cats: ColunaMeta[] = categoriasOrdenadas.map(c => ({
      kind: 'categoria',
      key: `cat:${c.id}`,
      categoryId: c.id,
      label: `${c.name.charAt(0).toUpperCase()}%`,
      fullLabel: `% ${c.name.toUpperCase()}`,
      placeholder: '0',
    }));
    return [...base, ...cats];
  }, [isAreaComercial, categoriasOrdenadas]);

  // Membros da área selecionada
  const membrosArea = useMemo(() => {
    if (!areaId) return [];
    return teamMembers.filter(m => {
      if (!m.active) return false;
      return getMemberAreaIds(m.id).includes(areaId);
    });
  }, [areaId, teamMembers, getMemberAreaIds]);

  // Metas do mês para a área
  const metasDoMes = useMemo(() => {
    return metas.filter(m => {
      if (m.areaId !== areaId) return false;
      if (!m.teamMemberId) return false;
      // Considera meta do mês quando a data inicial cai dentro do mês
      // selecionado. Isso cobre tanto o formato novo (start=01, end=último dia)
      // quanto o legado "personalizada" (start=01, end=01 do mês seguinte).
      const start = m.startDate || '';
      return start >= mesStart && start <= mesEnd;
    });
  }, [metas, areaId, mesStart, mesEnd]);

  // Linhas da tabela — inicializadas com valores existentes
  const [linhas, setLinhas] = useState<LinhaConsultor[]>([]);
  const [areaIdInit, setAreaIdInit] = useState('');
  const [mesStartInit, setMesStartInit] = useState('');

  // Re-inicializar quando área ou mês mudar
  const linhasComputadas: LinhaConsultor[] = useMemo(() => {
    return membrosArea.map(member => {
      const valores: Record<string, string> = {};
      const metasExistentes: Record<string, string | null> = {};

      colunas.forEach(col => {
        valores[col.key] = '';
        metasExistentes[col.key] = null;
        if (col.kind === 'meta') {
          const meta = metasDoMes.find(m => m.teamMemberId === member.id && m.type === col.tipo);
          if (meta) {
            metasExistentes[col.key] = meta.id;
            valores[col.key] = col.isCurrency
              ? meta.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : String(meta.value);
          }
        } else {
          const meta = metasDoMes.find(m => m.teamMemberId === member.id && m.type === 'categoria' && m.categoryId === col.categoryId);
          if (meta) {
            metasExistentes[col.key] = meta.id;
            valores[col.key] = String(meta.value);
          }
        }
      });

      return { memberId: member.id, memberName: member.name, valores, metasExistentes, modificado: false };
    });
  }, [membrosArea, metasDoMes, colunas]);

  // Usar linhas do state se mesma área/mês, senão usar computadas
  const linhasAtivas = (areaId === areaIdInit && mesStart === mesStartInit && linhas.length > 0)
    ? linhas
    : linhasComputadas;

  const setLinhasAtivas = useCallback((fn: (prev: LinhaConsultor[]) => LinhaConsultor[]) => {
    setAreaIdInit(areaId);
    setMesStartInit(mesStart);
    setLinhas(prev => {
      const mesmaArea = areaId === areaIdInit && mesStart === mesStartInit && prev.length > 0;
      return fn(mesmaArea ? prev : linhasComputadas);
    });
  }, [areaId, mesStart, areaIdInit, mesStartInit, linhasComputadas]);

  // Atualizar valor de uma célula
  const handleValor = (memberId: string, colKey: string, valor: string) => {
    setLinhasAtivas(prev => prev.map(l =>
      l.memberId !== memberId ? l : {
        ...l,
        valores: { ...l.valores, [colKey]: valor },
        modificado: true,
      }
    ));
  };

  // Copiar coluna: preencher todos os membros com o mesmo valor do primeiro
  const copiarColuna = (colKey: string) => {
    const primeiro = linhasAtivas[0]?.valores[colKey];
    if (!primeiro) return;
    setLinhasAtivas(prev => prev.map(l => ({
      ...l,
      valores: { ...l.valores, [colKey]: primeiro },
      modificado: true,
    })));
    toast.success(`Valor copiado para todos os colaboradores`);
  };

  // Colar mês anterior
  const colarMesAnterior = () => {
    const mesAnterior = subMonths(refDate, 1);
    const startAnterior = formatLocalDate(startOfMonth(mesAnterior));
    const endAnterior   = formatLocalDate(endOfMonth(mesAnterior));

    const metasAnterior = metas.filter(m => {
      if (m.areaId !== areaId || !m.teamMemberId) return false;
      const s = m.startDate || '';
      return s >= startAnterior && s <= endAnterior;
    });

    if (metasAnterior.length === 0) {
      toast.error('Nenhuma meta encontrada no mês anterior');
      return;
    }

    setLinhasAtivas(prev => prev.map(l => {
      const novoValores = { ...l.valores };
      colunas.forEach(col => {
        if (col.kind === 'meta') {
          const meta = metasAnterior.find(m => m.teamMemberId === l.memberId && m.type === col.tipo);
          if (meta) {
            novoValores[col.key] = col.isCurrency
              ? meta.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : String(meta.value);
          }
        } else {
          const meta = metasAnterior.find(m => m.teamMemberId === l.memberId && m.type === 'categoria' && m.categoryId === col.categoryId);
          if (meta) novoValores[col.key] = String(meta.value);
        }
      });
      return { ...l, valores: novoValores, modificado: true };
    }));
    toast.success(`Metas de ${format(mesAnterior, "MMMM", { locale: ptBR })} copiadas`);
  };

  // Limpar linha
  const limparLinha = (memberId: string) => {
    setLinhasAtivas(prev => prev.map(l =>
      l.memberId !== memberId ? l : {
        ...l,
        valores: Object.fromEntries(colunas.map(c => [c.key, ''])),
        modificado: true,
      }
    ));
  };

  // Salvar tudo
  const salvarTudo = async () => {
    if (!areaId) return;
    setSaving(true);
    try {
      const linhasPendentes = linhasAtivas.filter(l => l.modificado);

      for (const linha of linhasPendentes) {
        for (const col of colunas) {
          const rawValor = linha.valores[col.key] || '';
          const valor = (col.kind === 'meta' && col.isCurrency)
            ? parseBRL(rawValor)
            : (col.kind === 'categoria' ? parseBRL(rawValor) : parseInt(rawValor || '0', 10));
          const metaId = linha.metasExistentes[col.key];

          if (valor > 0) {
            if (metaId) {
              // Atualizar existente
              updateMeta(metaId, { value: valor, startDate: mesStart, endDate: mesEnd });
            } else {
              // Criar nova
              addMeta({
                areaId,
                teamMemberId: linha.memberId,
                type: col.kind === 'meta' ? col.tipo : 'categoria',
                categoryId: col.kind === 'categoria' ? col.categoryId : undefined,
                value: valor,
                validityType: 'mensal',
                startDate: mesStart,
                endDate: mesEnd,
                isActive: true,
              });
            }
          } else if (valor === 0 && metaId) {
            // Valor zerado = excluir meta existente
            deleteMeta(metaId);
          }
        }
      }

      // Reset modificado
      setLinhasAtivas(prev => prev.map(l => ({ ...l, modificado: false })));
      setSavedAt(new Date());
      toast.success(`Metas de ${mesLabel} salvas com sucesso`);
    } catch (err) {
      toast.error('Erro ao salvar metas', { description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const totalModificado = linhasAtivas.filter(l => l.modificado).length;
  const temDados = linhasAtivas.some(l => colunas.some(c => l.valores[c.key]));

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho: navegação de mês + área ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setRefDate(d => subMonths(d, 1)); setLinhas([]); }}
            className="p-2 hover:bg-muted rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold uppercase tracking-widest min-w-[160px] text-center capitalize">
            {mesLabel}
          </span>
          <button
            onClick={() => { setRefDate(d => addMonths(d, 1)); setLinhas([]); }}
            className="p-2 hover:bg-muted rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selecionar área */}
          <div className="flex gap-1 flex-wrap">
            {areas.map(area => (
              <button
                key={area.id}
                onClick={() => { setAreaId(area.id); setLinhas([]); }}
                className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider border transition-colors ${
                  areaId === area.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-black/20 hover:border-black'
                }`}
              >
                {area.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Aviso sem área selecionada ─────────────────────────────────── */}
      {!areaId && (
        <div className="flex items-center gap-3 p-4 border border-black/20 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Selecione uma área acima para ver e editar as metas dos colaboradores.
        </div>
      )}

      {/* ── Sem membros na área ────────────────────────────────────────── */}
      {areaId && membrosArea.length === 0 && (
        <div className="flex items-center gap-3 p-4 border border-black/20 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Nenhum colaborador ativo encontrado nesta área.
        </div>
      )}

      {/* ── Tabela de edição em massa ──────────────────────────────────── */}
      {areaId && membrosArea.length > 0 && (
        <div className="space-y-3">

          {/* Ações da tabela */}
          <div className="flex items-center justify-between flex-wrap gap-2 py-2 border-b border-black/10">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={colarMesAnterior}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-black/30 hover:border-black transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar mês anterior
              </button>
              <button
                onClick={salvarTudo}
                disabled={saving || totalModificado === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-foreground text-background hover:opacity-80 disabled:opacity-40 transition-opacity uppercase tracking-wider"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Salvando...' : 'Salvar tudo'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {savedAt && !totalModificado && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  Salvo às {format(savedAt, 'HH:mm')}
                </span>
              )}
              {totalModificado > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  {totalModificado} linha(s) com alterações
                </span>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black bg-muted/30">
                  <th className="text-left p-1.5 text-xs uppercase tracking-widest font-medium min-w-[140px]">
                    Colaborador
                  </th>
                  {colunas.map(col => (
                    <th key={col.key} className={`p-1.5 text-[10px] uppercase tracking-wider font-medium ${col.kind === 'categoria' ? 'min-w-[58px]' : 'min-w-[100px]'}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span title={col.kind === 'categoria' ? (col as any).fullLabel : col.label}>{col.label}</span>
                        <button
                          onClick={() => copiarColuna(col.key)}
                          title={`Copiar valor do 1º colaborador para todos`}
                          className="p-0.5 opacity-30 hover:opacity-80 transition-opacity"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {linhasAtivas.map((linha, idx) => (
                  <tr
                    key={linha.memberId}
                    className={`border-b border-black/10 last:border-0 transition-colors ${
                      linha.modificado ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    {/* Nome */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{linha.memberName}</span>
                        {linha.modificado && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Inputs por coluna */}
                    {colunas.map(col => {
                      const temMetaExistente = !!linha.metasExistentes[col.key];
                      const isCurrency = col.kind === 'meta' && !!col.isCurrency;
                      const isPercent = col.kind === 'categoria';
                      return (
                        <td key={col.key} className="p-2">
                          <div className="relative">
                            {isCurrency && (
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                                R$
                              </span>
                            )}
                            {isPercent && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                                %
                              </span>
                            )}
                            <input
                              type={isCurrency ? 'text' : 'number'}
                              inputMode={isCurrency ? 'decimal' : 'numeric'}
                              min="0"
                              max={isPercent ? 100 : undefined}
                              value={linha.valores[col.key] || ''}
                              onChange={e => handleValor(linha.memberId, col.key, e.target.value)}
                              placeholder={col.placeholder}
                              className={`w-full border text-sm py-1.5 rounded-sm transition-colors focus:outline-none focus:ring-1 focus:ring-black bg-white text-neutral-900 placeholder:text-neutral-500 ${
                                isCurrency ? 'pl-7 pr-2' : isPercent ? 'pl-2 pr-6' : 'pl-2 pr-2'
                              } ${
                                temMetaExistente
                                  ? 'border-green-400/60'
                                  : 'border-black/20 hover:border-black/50'
                              }`}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const rows = document.querySelectorAll(`[data-tipo="${col.key}"]`);
                                  const next = rows[idx + 1] as HTMLElement;
                                  if (next) next.focus();
                                }
                              }}
                              data-tipo={col.key}
                            />
                            {temMetaExistente && !linha.modificado && (
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Limpar linha */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => limparLinha(linha.memberId)}
                        title="Limpar linha"
                        className="p-1.5 opacity-20 hover:opacity-60 hover:text-destructive transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Salvar — fixo no rodapé visível da aba, fora da rolagem horizontal */}
          <div className="sticky bottom-0 z-30 bg-card border-t border-black/10 py-3">
            <div className="flex items-center justify-end gap-3">
              {totalModificado > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  {totalModificado} linha(s) com alterações
                </span>
              )}
              <button
                onClick={salvarTudo}
                disabled={saving || totalModificado === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-foreground text-background hover:opacity-80 disabled:opacity-40 transition-opacity uppercase tracking-wider"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Salvando...' : 'Salvar tudo'}
              </button>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Meta já cadastrada
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Alteração pendente
            </span>
            <span>Pressione Enter para navegar entre linhas</span>
            <span>Valor 0 = remove a meta</span>
          </div>
        </div>
      )}

      {/* ── Histórico: metas de outros períodos da área ──────────────────── */}
      {areaId && (
        <OutrosPeriodos areaId={areaId} mesStart={mesStart} />
      )}
    </div>
  );
}

// ── Sub-componente: exibe metas de outros períodos (colapsável) ───────────────

function OutrosPeriodos({ areaId, mesStart }: { areaId: string; mesStart: string }) {
  const { metas, teamMembers, deleteMeta } = useApp();
  const [aberto, setAberto] = useState(false);

  const outrosPeriodos = useMemo(() => {
    return metas
      .filter(m => m.areaId === areaId && m.startDate !== mesStart && m.teamMemberId)
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  }, [metas, areaId, mesStart]);

  if (outrosPeriodos.length === 0) return null;

  return (
    <div className="border border-black/15">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between p-3 text-xs uppercase tracking-widest text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        <span>Outros períodos cadastrados ({outrosPeriodos.length} metas)</span>
        <ChevronRight className={`w-4 h-4 transition-transform ${aberto ? 'rotate-90' : ''}`} />
      </button>
      {aberto && (
        <div className="border-t border-black/10 divide-y divide-black/5">
          {outrosPeriodos.map(meta => {
            const member = teamMembers.find(m => m.id === meta.teamMemberId);
            const tipoLabel = TIPO_LABELS[meta.type as MetaType]?.label || meta.type;
            return (
              <div key={meta.id} className="flex items-center justify-between px-3 py-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{member?.name || '—'}</span>
                  <span className="text-muted-foreground">{tipoLabel}</span>
                  <span className="font-semibold">
                    {meta.type === 'vendas'
                      ? `R$ ${meta.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : meta.value}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    {meta.startDate ? new Date(meta.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    {' → '}
                    {meta.endDate ? new Date(meta.endDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  </span>
                  <button
                    onClick={() => deleteMeta(meta.id)}
                    className="p-1 opacity-30 hover:opacity-70 hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
