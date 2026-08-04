import { useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval,
  isWithinInterval, parseISO, format, differenceInDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, AlertTriangle, Flame, CheckCircle2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSetup } from '@/contexts/SetupContext';
import { useActions, useProfessionals } from '@/hooks/useDatabase';
import { useProjects } from '@/hooks/useProjects';
import { calculateProfessionalCategory } from '@/hooks/useProfessionalCategory';
import type { Professional } from '@/types';

interface Props {
  teamMemberId: string;
  teamMemberName: string;
  /** true quando o colaborador é da área de Projetos (mostra meta de projetos) */
  isProjetos?: boolean;
  isComercial?: boolean;
  /** ação do botão "+ Registrar Ação" no topo do card MEU MUNDO */
  onRegistrarAcao?: () => void;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

const ACTIVE_PIPELINE = new Set(['AGUARDANDO_INICIO', 'INICIADO', 'CONCLUIDO', 'EM_REFORMA', 'PAUSADO']);

function pct(done: number, goal: number) {
  if (!goal) return 0;
  return (done / goal) * 100;
}

function lightClass(p: number) {
  if (p >= 100) return 'text-success';
  if (p >= 70) return 'text-amber-400';
  return 'text-destructive';
}

function lightBg(p: number) {
  if (p >= 100) return 'bg-success';
  if (p >= 70) return 'bg-amber-400';
  return 'bg-destructive';
}

function MetaLinha({ label, value, meta, bigMeta }: { label: string; value: string; meta: string; bigMeta?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm uppercase tracking-widest font-semibold">{label}</span>
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{meta}</p>
      {bigMeta && (
        <p className="text-[11px] text-muted-foreground font-semibold">{bigMeta}</p>
      )}
    </div>
  );
}

export function MeuCockpit({ teamMemberId, teamMemberName, isProjetos, isComercial = true, onRegistrarAcao }: Props) {
  const { metas, actionTypes, professionalCategories } = useSetup();
  const { data: allActions = [] } = useActions();
  const { data: allProjects = [] } = useProjects();
  const { data: allProfessionals = [] } = useProfessionals();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');

  const weeksInMonth = useMemo(
    () => eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 }).length || 4,
    [monthStart.getTime(), monthEnd.getTime()]
  );

  const typeById = useMemo(() => new Map(actionTypes.map(t => [t.id, t])), [actionTypes]);

  // ── Ações do colaborador ──────────────────────────────────────────────────
  const myActions = useMemo(
    () => (allActions || []).filter((a: any) => a.consultant_id === teamMemberId && a.action_date),
    [allActions, teamMemberId]
  );

  const inMonth = (d: string) => isWithinInterval(parseISO(d), { start: monthStart, end: monthEnd });
  const inWeek = (d: string) => isWithinInterval(parseISO(d), { start: weekStart, end: weekEnd });

  const realizado = useMemo(() => {
    const acc = {
      vendasMes: 0, vendasSemana: 0,
      acoesMes: 0, acoesSemana: 0, captacaoMes: 0,
      projetosMes: 0, projetosSemana: 0,
      prospeccaoSemana: 0, relacionamentoSemana: 0, apresentacaoSemana: 0, fechamentoSemana: 0,
    };
    myActions.forEach((a: any) => {
      const t = typeById.get(a.action_type_id);
      const mes = inMonth(a.action_date);
      const semana = inWeek(a.action_date);
      if (!mes && !semana) return;
      const value = Number(a.value) || 0;
      if (t?.classification === 'venda') {
        if (mes) acc.vendasMes += value;
        if (semana) { acc.vendasSemana += value; acc.fechamentoSemana += 1; }
      }
      if (t?.classification === 'projeto') {
        if (mes) acc.projetosMes += 1;
        if (semana) { acc.projetosSemana += 1; acc.apresentacaoSemana += 1; }
      }
      if (mes) acc.acoesMes += 1;
      if (semana) {
        acc.acoesSemana += 1;
        if (t?.impactsMetas?.includes('captacao')) acc.prospeccaoSemana += 1;
        if (t?.classification === 'relacionamento') acc.relacionamentoSemana += 1;
      }
      if (mes && t?.impactsMetas?.includes('captacao')) acc.captacaoMes += 1;
    });
    return acc;
  }, [myActions, typeById, monthStart.getTime(), weekStart.getTime()]);

  // ── Metas (somente leitura, vindas do Setup) ──────────────────────────────
  const metaMes = useMemo(() => {
    const relevantes = metas.filter(m => {
      if (!m.isActive || m.teamMemberId !== teamMemberId) return false;
      if (!m.startDate) return true;
      const s = parseISO(m.startDate);
      const e = m.endDate ? parseISO(m.endDate) : monthEnd;
      return s <= monthEnd && e >= monthStart;
    });
    const sum = (type: string) => relevantes.filter(m => m.type === type).reduce((a, m) => a + Number(m.value || 0), 0);
    return { vendas: sum('vendas'), acoes: sum('acoes'), projeto: sum('projeto'), captacao: sum('captacao') };
  }, [metas, teamMemberId, monthStart.getTime(), monthEnd.getTime()]);

  const metaSemana = {
    vendas: metaMes.vendas / weeksInMonth,
    acoes: metaMes.acoes / weeksInMonth,
    projeto: metaMes.projeto / weeksInMonth,
    captacao: metaMes.captacao / weeksInMonth,
  };

  // ── Projetos do colaborador ───────────────────────────────────────────────
  const myProjects = useMemo(
    () => (allProjects || []).filter((p: any) => p.responsible_id === teamMemberId),
    [allProjects, teamMemberId]
  );

  const carteira = useMemo(() => {
    return myProjects
      .filter((p: any) => ACTIVE_PIPELINE.has(p.planner_status))
      .map((p: any) => {
        const ref = p.planner_status_at || p.planner_data_iniciado || p.created_at;
        return { ...p, diasParado: ref ? differenceInDays(now, new Date(ref)) : 0 };
      })
      .sort((a: any, b: any) => b.diasParado - a.diasParado);
  }, [myProjects]);

  const carteiraValor = carteira.reduce((s: number, p: any) => s + (Number(p.estimated_value) || 0), 0);
  const briefings = carteira.filter((p: any) => p.planner_status === 'CONCLUIDO');
  const apresentacoes = carteira.filter((p: any) => p.planner_status === 'INICIADO');
  const projetosParados = carteira.filter((p: any) => p.diasParado >= 15);

  // ── Especificadores esfriando ─────────────────────────────────────────────
  const esfriando = useMemo(() => {
    return (allProfessionals || [])
      .filter((p: any) => p.consultant_id === teamMemberId)
      .map((p: any) => {
        const prof: Professional = {
          id: p.id, name: p.name, typeId: p.type_id, consultantId: p.consultant_id,
          categoryId: p.category_id, lastActionDate: p.last_action_date ?? undefined,
          lastActionTypeId: p.last_action_type_id ?? undefined,
          isManualCategory: p.is_manual_category ?? false,
        };
        const calc = calculateProfessionalCategory(prof, professionalCategories, actionTypes);
        const cat = professionalCategories.find(c => c.id === calc.categoryId);
        return { id: p.id, name: p.name, daysRemaining: calc.daysRemaining, isExpired: calc.isExpired, categoria: cat?.name || '—' };
      })
      .sort((a, b) => (a.isExpired === b.isExpired ? a.daysRemaining - b.daysRemaining : a.isExpired ? -1 : 1));
  }, [allProfessionals, teamMemberId, professionalCategories, actionTypes]);

  const esfriandoUrgente = esfriando.filter(e => e.isExpired || e.daysRemaining <= 7);

  // ── Perfil dos profissionais (categorias com meta de faixa) ───────────────
  const perfil = useMemo(() => {
    const meus = (allProfessionals || []).filter((p: any) => p.consultant_id === teamMemberId);
    const total = meus.length;
    const order = (n: string) => {
      const u = (n || '').toUpperCase();
      if (u.includes('ENCANT')) return 0;
      if (u.includes('CURIOS')) return 1;
      if (u.includes('DISTANT')) return 2;
      return 3;
    };
    const linhas = professionalCategories
      .map(cat => {
        const count = meus.filter((p: any) => p.category_id === cat.id).length;
        const p = total > 0 ? (count / total) * 100 : 0;
        const hasMin = (cat.minPercentage ?? 0) > 0;
        const hasMax = (cat.maxPercentage ?? 0) > 0;
        let label = '—';
        let alvo = 0;
        let onTarget = true;
        if (hasMin && hasMax) {
          label = `mais que ${cat.minPercentage}%`;
          alvo = cat.maxPercentage!;
          onTarget = p >= cat.minPercentage! && p <= cat.maxPercentage!;
        } else if (hasMin) {
          label = `mais que ${cat.minPercentage}%`;
          alvo = cat.minPercentage!;
          onTarget = p >= cat.minPercentage!;
        } else if (hasMax) {
          label = `menos que ${cat.maxPercentage}%`;
          alvo = cat.maxPercentage!;
          onTarget = p <= cat.maxPercentage!;
        }
        const barra = alvo > 0 ? Math.min(100, (p / alvo) * 100) : 0;
        return { id: cat.id, name: (cat.name || '').toUpperCase(), count, p, label, barra, onTarget, hasMeta: hasMin || hasMax };
      })
      .sort((a, b) => order(a.name) - order(b.name));
    return { total, linhas };
  }, [allProfessionals, teamMemberId, professionalCategories]);

  // ── % da meta da semana (média das metas ativas) ───────────────────────────
  const metaSemanaPct = useMemo(() => {
    const pares: [number, number][] = [];
    if (isComercial) {
      if (metaSemana.vendas > 0) pares.push([realizado.vendasSemana, metaSemana.vendas]);
      if (metaSemana.acoes > 0) pares.push([realizado.acoesSemana, metaSemana.acoes]);
      if (metaSemana.captacao > 0) pares.push([realizado.prospeccaoSemana, metaSemana.captacao]);
    }
    if (isProjetos && metaSemana.projeto > 0) pares.push([realizado.projetosSemana, metaSemana.projeto]);
    if (!pares.length) return null;
    return pares.reduce((s, [d, g]) => s + Math.min(150, pct(d, g)), 0) / pares.length;
  }, [isComercial, isProjetos, metaSemana, realizado]);

  // ── Foco do dia: até 3 prioridades derivadas dos dados do colaborador ─────
  const focos = useMemo(() => {
    const list: { title: string; reason: string; tag: string; urgent?: boolean }[] = [];

    if (projetosParados.length > 0) {
      list.push({
        title: `Retomar ${projetosParados.length} projeto${projetosParados.length > 1 ? 's' : ''} parado${projetosParados.length > 1 ? 's' : ''}`,
        reason: projetosParados.slice(0, 3).map((p: any) => `${p.clients?.name || p.name} ${p.diasParado}dc`).join(' · '),
        tag: 'urgente',
        urgent: true,
      });
    }

    if (esfriandoUrgente.length > 0) {
      list.push({
        title: `Falar com ${esfriandoUrgente.length} especificador${esfriandoUrgente.length > 1 ? 'es' : ''}`,
        reason: esfriandoUrgente.slice(0, 3).map(e => `${e.name} ${e.isExpired ? 'esfriou' : `${e.daysRemaining}dc`}`).join(' · '),
        tag: 'atenção',
      });
    }

    if (briefings.length > 0) {
      list.push({
        title: `Completar ${briefings.length} briefing${briefings.length > 1 ? 's' : ''}`,
        reason: briefings.slice(0, 3).map((p: any) => `${p.clients?.name || p.name} ${p.diasParado}dc`).join(' · '),
        tag: 'briefing',
      });
    }

    if (isComercial && metaSemana.vendas > 0 && realizado.vendasSemana < metaSemana.vendas) {
      list.push({
        title: `Faltam ${fmtBRL(metaSemana.vendas - realizado.vendasSemana)} na meta da semana`,
        reason: 'Registre a venda em “+ Registrar Ação” assim que fechar.',
        tag: 'meta',
      });
    }

    if (isComercial && metaSemana.captacao > 0 && realizado.prospeccaoSemana < metaSemana.captacao) {
      const falta = Math.ceil(metaSemana.captacao - realizado.prospeccaoSemana);
      list.push({
        title: `Fazer ${falta} captação${falta > 1 ? 'ões' : ''} nesta semana`,
        reason: `Realizado ${realizado.prospeccaoSemana} de ${Math.round(metaSemana.captacao)} previstos.`,
        tag: 'captação',
      });
    }

    if (isComercial && metaSemana.acoes > 0 && realizado.acoesSemana < metaSemana.acoes) {
      const falta = Math.ceil(metaSemana.acoes - realizado.acoesSemana);
      list.push({
        title: `Registrar ${falta} ação${falta > 1 ? 'ões' : ''} para bater a semana`,
        reason: `Realizado ${realizado.acoesSemana} de ${Math.round(metaSemana.acoes)} previstos.`,
        tag: 'ações',
      });
    }

    if (isProjetos && metaSemana.projeto > 0 && realizado.projetosSemana < metaSemana.projeto) {
      const falta = Math.ceil(metaSemana.projeto - realizado.projetosSemana);
      list.push({
        title: `Entregar ${falta} projeto${falta > 1 ? 's' : ''} nesta semana`,
        reason: `Realizado ${realizado.projetosSemana} de ${Math.round(metaSemana.projeto)} previstos.`,
        tag: 'projetos',
      });
    }

    return list.slice(0, 3);
  }, [projetosParados, esfriandoUrgente, briefings, isComercial, isProjetos, metaSemana, realizado]);

  const foraDaMeta =
    (metaMes.vendas > 0 && pct(realizado.vendasMes, metaMes.vendas) < 70) ||
    (metaMes.acoes > 0 && pct(realizado.acoesMes, metaMes.acoes) < 70) ||
    (isProjetos && metaMes.projeto > 0 && pct(realizado.projetosMes, metaMes.projeto) < 70);

  return (
    <div className="space-y-6">
      {/* ── Topo: foco do dia ───────────────────────────────────────────── */}
      <Card className="border-foreground/20 shadow-sm">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-foreground/70 font-semibold">Meu mundo</p>
              <h2 className="text-2xl font-bold tracking-tight">{teamMemberName.split(' ')[0]}, sua semana</h2>
              <p className="text-xs text-foreground/80 font-medium">
                {format(weekStart, "dd 'de' MMM", { locale: ptBR })} — {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded ${metaSemanaPct !== null && metaSemanaPct >= 100 ? 'border-success/40 bg-success/10' : metaSemanaPct !== null && metaSemanaPct >= 70 ? 'border-warning/40 bg-warning/10' : 'border-destructive/40 bg-destructive/10'}`}>
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-2xl font-bold ${metaSemanaPct !== null ? lightClass(metaSemanaPct) : ''}`}>
                    {metaSemanaPct !== null ? `${metaSemanaPct.toFixed(0)}%` : '—'}
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-foreground/70 mt-1 font-semibold">
                  meta da semana atingida
                </p>
              </div>
              {onRegistrarAcao && (
                <Button onClick={onRegistrarAcao} size="lg" className="gap-2">
                  <Plus className="h-4 w-4" /> Registrar Ação
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-foreground/80 font-semibold flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" /> Foco de hoje
            </p>
            {focos.length === 0 ? (
              <div className="border border-foreground/15 rounded p-3 flex items-start gap-3 bg-card">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold">Semana em dia 👌</p>
                  <p className="text-foreground/70 mt-0.5">
                    Siga o caminho: registre novas ações em “+ Registrar Ação” para ampliar a carteira.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {focos.map((f, i) => (
                  <li
                    key={f.title}
                    className={`border rounded p-3.5 space-y-1.5 transition-colors ${f.urgent ? 'border-destructive bg-destructive/10' : 'border-foreground/15 bg-card hover:border-foreground/30'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-foreground/70">{i + 1}</span>
                      <Badge variant={f.urgent ? 'destructive' : 'default'} className="text-[10px] uppercase">
                        {f.tag}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold leading-snug">{f.title}</p>
                    <p className="text-[11px] text-foreground/70 leading-snug">{f.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {foraDaMeta && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-destructive uppercase tracking-widest">Atenção à meta</p>
              <p className="text-foreground/80 mt-1 font-medium">
                Você está abaixo do ritmo necessário no mês. Priorize prospecção, relacionamento e fechamentos nesta semana.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 1. MINHAS METAS ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <Target className="h-3.5 w-3.5" /> 1 · Minhas Metas
        </h3>
        <Card className="border-border max-w-xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm tracking-[0.15em] uppercase font-semibold">{teamMemberName}</p>
              {isComercial && (
                <span className="text-xs text-muted-foreground">{perfil.total} prof.</span>
              )}
            </div>

            <div className="space-y-3">
              {isComercial && (
                <>
                  <MetaLinha label="Vendas" value={fmtBRL(realizado.vendasMes)} meta={metaMes.vendas > 0 ? `Meta: ${fmtBRL(metaMes.vendas)}` : 'Meta: —'} />
                  <MetaLinha label="Captação" value={String(realizado.captacaoMes)} meta={metaMes.captacao > 0 ? `Meta: ${Math.round(metaMes.captacao)}` : 'Meta: —'} />
                  <MetaLinha label="Ações" value={String(realizado.acoesMes)} meta={metaMes.acoes > 0 ? `Meta: ${Math.round(metaMes.acoes)}` : 'Meta: —'} />
                </>
              )}
              {isProjetos && !isComercial && (
                <>
                  <MetaLinha label="Projetos" value={String(realizado.projetosMes)} meta={metaMes.projeto > 0 ? `Meta: ${Math.round(metaMes.projeto)}` : 'Meta: —'} />
                  <MetaLinha label="Ações" value={String(realizado.acoesMes)} meta={metaMes.acoes > 0 ? `Meta: ${Math.round(metaMes.acoes)}` : 'Meta: —'} />
                </>
              )}
            </div>

            {isComercial && perfil.linhas.length > 0 && (
              <div className="pt-3 border-t border-border space-y-3">
                {perfil.linhas.map(l => (
                  <div key={l.id} className="space-y-1">
                    <p className="text-xs uppercase tracking-widest font-semibold">% {l.name}</p>
                    <p className="text-[11px] text-muted-foreground">Meta: {l.label}</p>
                    <div className="h-1.5 w-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${l.hasMeta ? (l.onTarget ? 'bg-success' : 'bg-destructive') : 'bg-muted-foreground'}`}
                        style={{ width: `${Math.max(2, l.barra)}%` }}
                      />
                    </div>
                    <p className="text-sm font-semibold">{l.p.toFixed(0)}%</p>
                  </div>
                ))}

                <div className="pt-3 border-t border-border space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Categorias</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {perfil.linhas.map(l => (
                      <span key={l.id}>
                        {l.name}: {l.count} <strong className="text-foreground">({l.p.toFixed(2)}%)</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {metaMes.vendas === 0 && metaMes.acoes === 0 && metaMes.projeto === 0 && metaMes.captacao === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma meta individual cadastrada para você neste mês. Peça à gestão para cadastrar em Setup → Metas.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── MEUS ALERTAS ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" /> Meus Alertas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AlertCard
            title="Especificadores esfriando — saindo de Curioso ou Encantado"
            count={esfriandoUrgente.length}
            items={esfriandoUrgente.slice(0, 5).map(e => `${e.name} · ${e.categoria} · ${e.isExpired ? 'esfriou' : `${e.daysRemaining}dc`}`)}
          />
          <AlertCard
            title="Projetos parados (15dc+)"
            count={projetosParados.length}
            items={projetosParados.slice(0, 5).map((p: any) => `${p.clients?.name || p.name} · ${p.diasParado}dc`)}
          />
        </div>
      </section>
    </div>
  );
}

function MetaCard({
  title, done, goal, monthDone, monthGoal, currency,
}: {
  title: string;
  done: number;
  goal: number;
  monthDone: number;
  monthGoal: number;
  currency?: boolean;
}) {
  const p = pct(done, goal);
  const pMes = pct(monthDone, monthGoal);
  const falta = Math.max(0, goal - done);
  const fmt = (v: number) => (currency ? fmtBRL(v) : Math.round(v).toString());
  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
          <span className={`h-2 w-2 rounded-full ${goal > 0 ? lightBg(p) : 'bg-muted'}`} />
        </div>

        <div className="flex items-end justify-between gap-2">
          <p className="text-xl font-semibold">{fmt(done)}</p>
          <p className="text-[11px] text-muted-foreground">
            de {goal > 0 ? fmt(goal) : '—'} previstos
            {goal > 0 && <span className={`ml-1 ${lightClass(p)}`}>· {p.toFixed(0)}%</span>}
          </p>
        </div>
        <Progress value={Math.min(100, p)} className="h-1.5" />
        {goal > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {falta > 0 ? `Faltam ${fmt(falta)} nesta semana` : 'Meta da semana atingida'}
          </p>
        )}

        <div className="pt-3 border-t border-border space-y-1.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Objetivo do mês</span>
            <span className={monthGoal > 0 ? lightClass(pMes) : ''}>
              {monthGoal > 0 ? `${pMes.toFixed(0)}%` : '—'}
            </span>
          </div>
          <Progress value={Math.min(100, pMes)} className="h-2" />
          <p className="text-[11px] text-muted-foreground">
            {fmt(monthDone)} / {monthGoal > 0 ? fmt(monthGoal) : '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({ title, count, items }: { title: string; count: number; items: string[] }) {
  return (
    <Card className={count > 0 ? 'border-destructive/50' : 'border-border'}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
          <Badge variant={count > 0 ? 'destructive' : 'secondary'} className="text-[10px]">{count}</Badge>
        </div>
        {count === 0 ? (
          <p className="text-xs text-muted-foreground">Nada pendente. 👌</p>
        ) : (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {items.map((t, i) => <li key={i} className="truncate">• {t}</li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}