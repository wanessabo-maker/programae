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

interface LinhaConsultor {
  memberId: string;
  memberName: string;
  valores: Record<MetaType, string>; // string para edição no input
  metasExistentes: Record<MetaType, string | null>; // id da meta existente ou null
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
  const { metas, areas, teamMembers, addMeta, updateMeta, deleteMeta } = useApp();
  const { getMemberAreaIds } = usePositions();

  // Mês de referência (padrão: mês atual)
  const [refDate, setRefDate] = useState(() => new Date());
  const [areaId, setAreaId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const mesLabel = format(refDate, "MMMM 'de' yyyy", { locale: ptBR });
  const mesStart = formatLocalDate(startOfMonth(refDate));
  const mesEnd   = formatLocalDate(endOfMonth(refDate));

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
      const valores: Record<MetaType, string> = { vendas: '', captacao: '', acoes: '', projeto: '' };
      const metasExistentes: Record<MetaType, string | null> = { vendas: null, captacao: null, acoes: null, projeto: null };

      TIPOS.forEach(tipo => {
        const meta = metasDoMes.find(m => m.teamMemberId === member.id && m.type === tipo);
        if (meta) {
          metasExistentes[tipo] = meta.id;
          valores[tipo] = tipo === 'vendas'
            ? meta.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : String(meta.value);
        }
      });

      return { memberId: member.id, memberName: member.name, valores, metasExistentes, modificado: false };
    });
  }, [membrosArea, metasDoMes]);

  // Usar linhas do state se mesma área/mês, senão usar computadas
  const linhasAtivas = (areaId === areaIdInit && mesStart === mesStartInit && linhas.length > 0)
    ? linhas
    : linhasComputadas;

  const setLinhasAtivas = useCallback((fn: (prev: LinhaConsultor[]) => LinhaConsultor[]) => {
    setAreaIdInit(areaId);
    setMesStartInit(mesStart);
    setLinhas(fn(linhasComputadas));
  }, [areaId, mesStart, linhasComputadas]);

  // Atualizar valor de uma célula
  const handleValor = (memberId: string, tipo: MetaType, valor: string) => {
    setLinhasAtivas(prev => prev.map(l =>
      l.memberId !== memberId ? l : {
        ...l,
        valores: { ...l.valores, [tipo]: valor },
        modificado: true,
      }
    ));
  };

  // Copiar coluna: preencher todos os membros com o mesmo valor do primeiro
  const copiarColuna = (tipo: MetaType) => {
    const primeiro = linhasAtivas[0]?.valores[tipo];
    if (!primeiro) return;
    setLinhasAtivas(prev => prev.map(l => ({
      ...l,
      valores: { ...l.valores, [tipo]: primeiro },
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
      TIPOS.forEach(tipo => {
        const meta = metasAnterior.find(m => m.teamMemberId === l.memberId && m.type === tipo);
        if (meta) {
          novoValores[tipo] = tipo === 'vendas'
            ? meta.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : String(meta.value);
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
        valores: { vendas: '', captacao: '', acoes: '', projeto: '' },
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
        for (const tipo of TIPOS) {
          const rawValor = linha.valores[tipo];
          const valor = tipo === 'vendas' ? parseBRL(rawValor) : parseInt(rawValor || '0', 10);
          const metaId = linha.metasExistentes[tipo];

          if (valor > 0) {
            if (metaId) {
              // Atualizar existente
              updateMeta(metaId, { value: valor, startDate: mesStart, endDate: mesEnd });
            } else {
              // Criar nova
              addMeta({
                areaId,
                teamMemberId: linha.memberId,
                type: tipo,
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
  const temDados = linhasAtivas.some(l => TIPOS.some(t => l.valores[t]));

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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={colarMesAnterior}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-black/30 hover:border-black transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar mês anterior
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
              <button
                onClick={salvarTudo}
                disabled={saving || totalModificado === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-foreground text-background hover:opacity-80 disabled:opacity-40 transition-opacity uppercase tracking-wider"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Salvando...' : 'Salvar tudo'}
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black bg-muted/30">
                  <th className="text-left p-3 text-xs uppercase tracking-widest font-medium min-w-[160px]">
                    Colaborador
                  </th>
                  {TIPOS.map(tipo => (
                    <th key={tipo} className="p-3 text-xs uppercase tracking-widest font-medium min-w-[130px]">
                      <div className="flex items-center justify-between gap-2">
                        <span>{TIPO_LABELS[tipo].label}</span>
                        <button
                          onClick={() => copiarColuna(tipo)}
                          title={`Copiar valor do 1º colaborador para todos`}
                          className="p-1 opacity-30 hover:opacity-80 transition-opacity"
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

                    {/* Inputs por tipo */}
                    {TIPOS.map(tipo => {
                      const temMetaExistente = !!linha.metasExistentes[tipo];
                      return (
                        <td key={tipo} className="p-2">
                          <div className="relative">
                            {tipo === 'vendas' && (
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                                R$
                              </span>
                            )}
                            <input
                              type={tipo === 'vendas' ? 'text' : 'number'}
                              inputMode={tipo === 'vendas' ? 'decimal' : 'numeric'}
                              min="0"
                              value={linha.valores[tipo]}
                              onChange={e => handleValor(linha.memberId, tipo, e.target.value)}
                              placeholder={TIPO_LABELS[tipo].placeholder}
                              className={`w-full border text-sm py-1.5 pr-2 rounded-sm transition-colors focus:outline-none focus:ring-1 focus:ring-black bg-background text-foreground ${
                                tipo === 'vendas' ? 'pl-7' : 'pl-2'
                              } ${
                                temMetaExistente
                                  ? 'border-green-400/60'
                                  : 'border-black/20 hover:border-black/50'
                              }`}
                              // Tab para próxima célula da mesma coluna
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  // Focar na próxima linha, mesma coluna
                                  const rows = document.querySelectorAll(`[data-tipo="${tipo}"]`);
                                  const next = rows[idx + 1] as HTMLElement;
                                  if (next) next.focus();
                                }
                              }}
                              data-tipo={tipo}
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
