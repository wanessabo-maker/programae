import { useState, useMemo } from 'react';
import { useCommercialIndicators } from '@/hooks/useCommercialIndicators';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { usePositions } from '@/hooks/usePositions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function IndicadoresTab() {
  const { isAdmin } = useAuthContext();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const { getMemberAreaIds, getAreaName } = usePositions();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { indicators, commercialMemberIds, isLoading } = useCommercialIndicators(selectedYear, selectedMonth);

  // Filter: non-admins see only their own data
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando indicadores...</p>;
  }

  if (visibleIndicators.length === 0) {
    return (
      <div className="space-y-4">
        <MonthSelector
          label={monthLabel}
          onPrev={goToPrevMonth}
          onNext={goToNextMonth}
        />
        <p className="text-sm text-muted-foreground">
          Nenhum colaborador comercial encontrado para este período.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <MonthSelector
        label={monthLabel}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
      />

      {/* Per-collaborator indicators */}
      {visibleIndicators.map(ind => (
        <div key={ind.memberId} className="space-y-4">
          <h3 className="text-sm font-medium tracking-widest uppercase border-b border-border pb-2">
            {ind.memberName}
          </h3>

          {/* Atividade Comercial */}
          <section>
            <p className="title-section">Atividade Comercial</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniMetric label="Relacionamentos" value={ind.relacionamentos} />
              <MiniMetric label="Apresentações" value={ind.apresentacoes} />
              <MiniMetric label="Vendas" value={ind.vendas} />
            </div>
          </section>

          {/* Conversão */}
          <section>
            <p className="title-section">Conversão</p>
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric
                label="Conversão Apres. → Venda"
                value={`${ind.taxaConversao.toFixed(1)}%`}
              />
              <MiniMetric label="Vendas Diretas" value={ind.vendasDiretas} />
            </div>
          </section>

          {/* Resultado Financeiro */}
          <section>
            <p className="title-section">Resultado Financeiro</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniMetric label="Valor Vendido" value={formatCurrency(ind.valorVendido)} />
              <MiniMetric label="Ticket Médio" value={formatCurrency(ind.ticketMedio)} />
              <MiniMetric label="Contratos Fechados" value={ind.contratosFechados} />
            </div>
          </section>

          {/* Funil Comercial */}
          <section>
            <p className="title-section">Funil Comercial</p>
            <div className="grid grid-cols-3 gap-3">
              <MiniMetric label="Em Negociação" value={ind.projetosEmNegociacao} />
              <MiniMetric label="Vendidos" value={ind.projetosVendidos} />
              <MiniMetric label="Perdidos" value={ind.projetosPerdidos} />
            </div>
          </section>
        </div>
      ))}
    </div>
  );
}

function MonthSelector({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-4">
      <button onClick={onPrev} className="p-1 hover:opacity-70">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm tracking-widest uppercase">{label}</span>
      <button onClick={onNext} className="p-1 hover:opacity-70">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-flat">
      <div className="text-2xl font-light tracking-tight">{value}</div>
      <div className="text-xs tracking-widest uppercase text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
