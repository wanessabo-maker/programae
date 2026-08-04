import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { Award, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

const PUNCTUALITY_PREFIX = 'Checklist no prazo:';
const CLOSING_BONUS_DESC = 'Bônus checklist 100% no prazo';

const fmt = (v?: string | null) => {
  if (!v) return '-';
  const d = parseISO(v);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '-';
};

interface Props {
  projectId: string;
  itemIds: string[];
}

export function ChecklistCreditsSection({ projectId, itemIds }: Props) {
  const { teamMembers } = useApp();

  const { data: credits = [] } = useQuery({
    queryKey: ['checklist-credits', projectId, itemIds],
    enabled: itemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, points, description, transaction_date, consultant_id, checklist_item_id, created_at')
        .in('checklist_item_id', itemIds)
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return (data || []).filter(
        t =>
          t.description?.startsWith(PUNCTUALITY_PREFIX) ||
          t.description?.startsWith(CLOSING_BONUS_DESC)
      );
    },
  });

  const { punctuality, bonus, totalPoints } = useMemo(() => {
    const punctuality = credits.filter(c => c.description?.startsWith(PUNCTUALITY_PREFIX));
    const bonus = credits.filter(c => c.description?.startsWith(CLOSING_BONUS_DESC));
    return {
      punctuality,
      bonus,
      totalPoints: credits.reduce((s, c) => s + (c.points || 0), 0),
    };
  }, [credits]);

  const memberName = (id?: string | null) =>
    (id && teamMembers.find(m => m.id === id)?.name) || '—';

  if (credits.length === 0) return null;

  const row = (c: (typeof credits)[number]) => (
    <div
      key={c.id}
      className="flex items-start justify-between gap-3 px-3 py-2 text-xs"
    >
      <div className="min-w-0">
        <p className="text-white truncate">{c.description}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">
          {fmt(c.transaction_date)} · {memberName(c.consultant_id)}
        </p>
      </div>
      <span className="text-green-400 font-medium whitespace-nowrap tabular-nums">
        +{c.points} pts
      </span>
    </div>
  );

  return (
    <div className="bg-neutral-700 p-4 rounded-lg border border-neutral-600 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" />
          Pontos gerados pelo checklist
        </span>
        <span className="text-sm font-medium text-green-400 tabular-nums">
          +{totalPoints} pts
        </span>
      </div>

      {punctuality.length > 0 && (
        <div>
          <p className="text-[10px] text-neutral-400 mb-1">
            Pontualidade ({punctuality.length})
          </p>
          <div className="border border-neutral-600 rounded-md divide-y divide-neutral-600 overflow-hidden">
            {punctuality.map(row)}
          </div>
        </div>
      )}

      {bonus.length > 0 && (
        <div>
          <p className="text-[10px] text-neutral-400 mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Bônus de fechamento ({bonus.length})
          </p>
          <div className="border border-neutral-600 rounded-md divide-y divide-neutral-600 overflow-hidden">
            {bonus.map(row)}
          </div>
        </div>
      )}
    </div>
  );
}
