import { useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval,
  isWithinInterval, parseISO, format, differenceInDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Target, AlertTriangle, Wallet, Users, Handshake, FileText, Presentation,
  Flame, CheckCircle2, Plus,
} from 'lucide-react';
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
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Meu mundo</p>
              <h2 className="text-lg font-semibold">{teamMemberName.split(' ')[0]}, sua semana</h2>
              <p className="text-xs text-muted-foreground">
                {format(weekStart, "dd 'de' MMM", { locale: ptBR })} — {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className={`text-2xl font-semibold ${metaSemanaPct !== null ? lightClass(metaSemanaPct) : ''}`}>
                  {metaSemanaPct !== null ? `${metaSemanaPct.toFixed(0)}%` : '—'}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                meta da semana atingida
              </p>
              </div>
              {onRegistrarAcao && (
                <Button onClick={onRegistrarAcao} className="gap-2">
                  <Plus className="h-4 w-4" /> Registrar Ação
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" /> Foco de hoje
            </p>
            {focos.length === 0 ? (
              <div className="border border-border rounded p-3 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold">Semana em dia 👌</p>
                  <p className="text-muted-foreground mt-0.5">
                    Siga o caminho: registre novas ações em “+ Registrar Ação” para ampliar a carteira.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {focos.map((f, i) => (
                  <li
                    key={f.title}
                    className={`border rounded p-3 space-y-1 ${f.urgent ? 'border-destructive/60 bg-destructive/5' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                      <Badge variant={f.urgent ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                        {f.tag}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold leading-snug">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{f.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {foraDaMeta && (
        <Card className="border-destructive/60 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-destructive uppercase tracking-widest">Atenção à meta</p>
              <p className="text-muted-foreground mt-1">
                Você está abaixo do ritmo necessário no mês. Priorize prospecção, relacionamento e fechamentos nesta semana.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 1. MINHA META ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <Target className="h-3.5 w-3.5" /> 1 · Minhas Metas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {isComercial && (
            <>
              <MetaCard
                title="Valor vendido — Semana"
                done={realizado.vendasSemana}
                goal={metaSemana.vendas}
                monthDone={realizado.vendasMes}
                monthGoal={metaMes.vendas}
                currency
              />
              <MetaCard
                title="Ações — Semana"
                done={realizado.acoesSemana}
                goal={metaSemana.acoes}
                monthDone={realizado.acoesMes}
                monthGoal={metaMes.acoes}
              />
              <MetaCard
                title="Captações — Semana"
                done={realizado.prospeccaoSemana}
                goal={metaSemana.captacao}
                monthDone={realizado.captacaoMes}
                monthGoal={metaMes.captacao}
              />
            </>
          )}
          {isProjetos && (
            <>
              <MetaCard
                title="Projetos — Semana"
                done={realizado.projetosSemana}
                goal={metaSemana.projeto}
                monthDone={realizado.projetosMes}
                monthGoal={metaMes.projeto}
              />
            </>
          )}
        </div>
        {metaMes.vendas === 0 && metaMes.acoes === 0 && metaMes.projeto === 0 && metaMes.captacao === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma meta individual cadastrada para você neste mês. Peça à gestão para cadastrar em Setup → Metas.
          </p>
        )}
      </section>

      {/* ── 2. MINHA SEMANA ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" /> Minha Semana
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <BlocoCard
            icon={<Users className="h-4 w-4" />}
            title="Prospecção"
            done={realizado.prospeccaoSemana}
            goal={metaSemana.captacao}
            hint="Novos especificadores e captação de projetos registrados na semana."
          />
          <BlocoCard
            icon={<Handshake className="h-4 w-4" />}
            title="Relacionamento / Ações"
            done={realizado.relacionamentoSemana}
            goal={metaSemana.acoes}
            hint="Priorize quem está esfriando:"
            items={esfriando.slice(0, 6).map(e => ({
              key: e.id,
              label: e.name,
              right: e.isExpired ? 'esfriou' : `${e.daysRemaining}d`,
              danger: e.isExpired || e.daysRemaining <= 7,
              sub: e.categoria,
            }))}
          />
          <BlocoCard
            icon={<Wallet className="h-4 w-4" />}
            title="Carteira Flutuante"
            done={carteira.length}
            goal={0}
            hint={`${fmtBRL(carteiraValor)} em negociação — mover no pipeline:`}
            items={carteira.slice(0, 6).map((p: any) => ({
              key: p.id,
              label: p.clients?.name || p.name,
              right: `${p.diasParado}d`,
              danger: p.diasParado >= 15,
              sub: p.focco_project_number ? `FOCCO ${p.focco_project_number}` : fmtBRL(Number(p.estimated_value) || 0),
            }))}
          />
          <BlocoCard
            icon={<FileText className="h-4 w-4" />}
            title="Briefing"
            done={briefings.length}
            goal={0}
            hint="Projetos concluídos aguardando dados para liberar a passagem a Projetos:"
            items={briefings.slice(0, 6).map((p: any) => ({
              key: p.id,
              label: p.clients?.name || p.name,
              right: `${p.diasParado}d`,
              danger: p.diasParado >= 10,
              sub: p.focco_project_number ? `FOCCO ${p.focco_project_number}` : '—',
            }))}
          />
          <BlocoCard
            icon={<Presentation className="h-4 w-4" />}
            title="Apresentações / Fechamentos"
            done={realizado.apresentacaoSemana + realizado.fechamentoSemana}
            goal={metaSemana.projeto}
            hint="Projetos iniciados a apresentar nesta semana:"
            items={apresentacoes.slice(0, 6).map((p: any) => ({
              key: p.id,
              label: p.clients?.name || p.name,
              right: `${p.diasParado}d`,
              danger: p.diasParado >= 15,
              sub: p.focco_project_number ? `FOCCO ${p.focco_project_number}` : '—',
            }))}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Registre as atividades em “+ Registrar Ação” ou movendo os cards do Pipeline — os indicadores acima
          são alimentados automaticamente.
        </p>
      </section>

      {/* ── 4. MEUS ALERTAS ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" /> Meus Alertas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AlertCard
            title="Especificadores esfriando"
            count={esfriandoUrgente.length}
            items={esfriandoUrgente.slice(0, 5).map(e => `${e.name} · ${e.isExpired ? 'esfriou' : `${e.daysRemaining}d`}`)}
          />
          <AlertCard
            title="Projetos parados (15d+)"
            count={projetosParados.length}
            items={projetosParados.slice(0, 5).map((p: any) => `${p.clients?.name || p.name} · ${p.diasParado}d`)}
          />
          <AlertCard
            title="Briefings pendentes"
            count={briefings.length}
            items={briefings.slice(0, 5).map((p: any) => `${p.clients?.name || p.name} · ${p.diasParado}d`)}
          />
        </div>
      </section>
    </div>
  );
}

function MetaCard({ title, done, goal, currency }: { title: string; done: number; goal: number; currency?: boolean }) {
  const p = pct(done, goal);
  const falta = Math.max(0, goal - done);
  const fmt = (v: number) => (currency ? fmtBRL(v) : Math.round(v).toString());
  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
          <span className={`h-2 w-2 rounded-full ${goal > 0 ? lightBg(p) : 'bg-muted'}`} />
        </div>
        <p className="text-xl font-semibold">{fmt(done)}</p>
        <Progress value={Math.min(100, p)} className="h-1.5" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Meta: {goal > 0 ? fmt(goal) : '—'}</span>
          <span className={goal > 0 ? lightClass(p) : ''}>{goal > 0 ? `${p.toFixed(0)}%` : '—'}</span>
        </div>
        {goal > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {falta > 0 ? `Faltam ${fmt(falta)}` : 'Meta atingida 🎉'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface BlocoItem { key: string; label: string; right?: string; sub?: string; danger?: boolean }

function BlocoCard({
  icon, title, done, goal, hint, items = [],
}: { icon: React.ReactNode; title: string; done: number; goal: number; hint?: string; items?: BlocoItem[] }) {
  const p = pct(done, goal);
  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-muted rounded text-muted-foreground">{icon}</div>
            <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {goal > 0 ? `${done} / ${Math.round(goal)}` : done}
          </Badge>
        </div>
        {goal > 0 && (
          <>
            <Progress value={Math.min(100, p)} className="h-1.5" />
            <p className={`text-[11px] ${lightClass(p)}`}>
              {p.toFixed(0)}% da meta da semana{p < 100 ? ` · faltam ${Math.max(0, Math.ceil(goal - done))}` : ''}
            </p>
          </>
        )}
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        {items.length > 0 && (
          <ul className="space-y-1.5 max-h-52 overflow-y-auto">
            {items.map(it => (
              <li key={it.key} className="text-xs border border-border rounded p-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.label}</div>
                  {it.sub && <div className="truncate text-[10px] text-muted-foreground">{it.sub}</div>}
                </div>
                {it.right && (
                  <span className={`shrink-0 text-[11px] ${it.danger ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                    {it.right}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
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