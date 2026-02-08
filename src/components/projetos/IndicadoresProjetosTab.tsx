import { useState, useMemo } from 'react';
import { useProjectIndicators } from '@/hooks/useProjectIndicators';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function IndicadoresProjetosTab() {
  const { isAdmin } = useAuthContext();
  const { data: currentTeamMember } = useCurrentTeamMember();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { indicators, isLoading } = useProjectIndicators(selectedYear, selectedMonth);

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
    return <p className="text-sm text-muted-foreground">Carregando indicadores...</p>;
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
    <div className="space-y-6">
      <MonthSelector label={monthLabel} onPrev={goToPrevMonth} onNext={goToNextMonth} />

      {visibleIndicators.map(ind => (
        <div key={ind.memberId} className="space-y-4">
          <h3 className="text-sm font-medium tracking-widest uppercase border-b border-border pb-2">
            {ind.memberName}
          </h3>

          {/* Produção */}
          <section>
            <p className="title-section">Produção</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniMetric label="Recebidos" value={ind.projetosRecebidos} />
              <MiniMetric label="Em Andamento" value={ind.projetosEmAndamento} />
              <MiniMetric label="Finalizados" value={ind.projetosFinalizados} />
            </div>
          </section>

          {/* Prazo */}
          <section>
            <p className="title-section">Prazo</p>
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="Dentro do Prazo" value={ind.dentroDoPrazo} />
              <MiniMetric label="Fora do Prazo" value={ind.foraDoPrazo} />
            </div>
          </section>

          {/* Integração com Comercial */}
          <section>
            <p className="title-section">Integração com Comercial</p>
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="Convertidos em Venda" value={ind.convertidosEmVenda} />
              <MiniMetric label="Perdidos após Apresentação" value={ind.perdidosAposApresentacao} />
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
