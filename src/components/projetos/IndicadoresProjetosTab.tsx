import { useState, useMemo } from 'react';
import { useProjectIndicators } from '@/hooks/useProjectIndicators';
import { useApresentacaoConversion } from '@/hooks/useApresentacaoConversion';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PenTool, Ruler, Hammer, TrendingUp, CheckCircle2, XCircle, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function IndicadoresProjetosTab() {
  const { isAdmin } = useAuthContext();
  const { data: currentTeamMember } = useCurrentTeamMember();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { conversionData, isLoading: conversionLoading } = useApresentacaoConversion(selectedYear, selectedMonth);

  const visibleIndicators = useMemo(() => {
    if (isAdmin) return indicators;
    if (!currentTeamMember) return [];
    return indicators.filter(i => i.memberId === currentTeamMember.id);
  }, [indicators, isAdmin, currentTeamMember]);

  const monthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });

  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <MonthSelector label={monthLabel} onPrev={goToPrevMonth} onNext={goToNextMonth} />
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (visibleIndicators.length === 0) {
    return (
      <div className="space-y-4">
        <MonthSelector label={monthLabel} onPrev={goToPrevMonth} onNext={goToNextMonth} />
        <p className="text-sm text-muted-foreground">
          Nenhum colaborador da área de Projetos encontrado para este período.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MonthSelector label={monthLabel} onPrev={goToPrevMonth} onNext={goToNextMonth} />

      {visibleIndicators.map(ind => (
        <div key={ind.memberId} className="space-y-5">
          <h3 className="text-sm font-semibold tracking-widest uppercase border-b border-border pb-2">
            {ind.memberName}
          </h3>

          {/* Produtividade */}
          <section className="space-y-3">
            <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">Produtividade</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard
                icon={<PenTool className="h-4 w-4 text-blue-500" />}
                label="Apresentação"
                value={ind.ambientesApresentacao}
              />
              <MetricCard
                icon={<Hammer className="h-4 w-4 text-orange-500" />}
                label="Reforma Apres."
                value={ind.ambientesReformaApresentacao}
              />
              <MetricCard
                icon={<Ruler className="h-4 w-4 text-green-500" />}
                label="Técnico"
                value={ind.ambientesTecnico}
              />
              <MetricCard
                icon={<Hammer className="h-4 w-4 text-red-500" />}
                label="Reforma Téc."
                value={ind.ambientesReformaTecnico}
              />
              <MetricCard
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                label="Total"
                value={ind.totalAmbientes}
                highlight
              />
            </div>
          </section>

          {/* Conversão em Vendas */}
          <section className="space-y-3">
            <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">Conversão em Vendas (Apresentação)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard
                icon={<PenTool className="h-4 w-4 text-blue-500" />}
                label="Apresentados"
                value={ind.projetosApresentados}
              />
              <MetricCard
                icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                label="Vendidos"
                value={ind.projetosConvertidos}
              />
              <MetricCard
                icon={<Clock className="h-4 w-4 text-amber-500" />}
                label="Em Negociação"
                value={ind.projetosEmNegociacao}
              />
              <MetricCard
                icon={<XCircle className="h-4 w-4 text-red-500" />}
                label="Perdidos"
                value={ind.projetosNaoConvertidos}
              />
              <MetricCard
                icon={<DollarSign className="h-4 w-4 text-green-600" />}
                label="Valor Vendido"
                value={formatCurrency(ind.valorVendido)}
                subtitle={`Taxa: ${ind.taxaConversao.toFixed(0)}%`}
                highlight
              />
            </div>
          </section>

          {/* Detalhe por FOCCO */}
          {ind.projetosDetalhe.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">Detalhamento por Nº FOCCO</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-xs tracking-wider uppercase text-muted-foreground">
                      <th className="text-left p-3 font-medium">Nº FOCCO</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-center p-3 font-medium">Ambientes</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ind.projetosDetalhe.map((p, idx) => (
                      <tr key={p.foccoNumber} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="p-3 font-mono font-medium">{p.foccoNumber}</td>
                        <td className="p-3 text-xs text-muted-foreground">{p.actionTypeName}</td>
                        <td className="p-3 text-center font-semibold">{p.ambientes}</td>
                        <td className="p-3 text-center">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="p-3 text-right font-medium">
                          {p.valorVendido ? formatCurrency(p.valorVendido) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ))}
    </div>
  );
}

function MonthSelector({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="icon" onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-lg font-semibold capitalize min-w-[160px] text-center">
        {label}
      </div>
      <Button variant="outline" size="icon" onClick={onNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function MetricCard({ icon, label, value, subtitle, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground tracking-wide">{label}</span>
        </div>
        <div className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'vendido':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Vendido</Badge>;
    case 'em_negociacao':
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Em Negociação</Badge>;
    case 'perdido':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs">Perdido</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Sem Projeto</Badge>;
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
