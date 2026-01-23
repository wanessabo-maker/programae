import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, History, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ValueHistoryEntry {
  id: string;
  presented_value: number;
  created_at: string;
  consultant_id: string | null;
  consultant_name?: string;
}

interface ProjectValueHistoryProps {
  projectId: string;
  currentValue?: number;
}

export function ProjectValueHistory({ projectId, currentValue }: ProjectValueHistoryProps) {
  const [history, setHistory] = useState<ValueHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_value_history')
          .select(`
            id,
            presented_value,
            created_at,
            consultant_id,
            team_members:consultant_id (name)
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const entries: ValueHistoryEntry[] = (data || []).map((entry: any) => ({
          id: entry.id,
          presented_value: entry.presented_value,
          created_at: entry.created_at,
          consultant_id: entry.consultant_id,
          consultant_name: entry.team_members?.name || 'Desconhecido',
        }));

        setHistory(entries);
      } catch (err) {
        console.error('Error fetching value history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchHistory();
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground">
        Carregando histórico...
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getVariation = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (variation: number) => {
    if (variation > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (variation < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="h-3 w-3" />
        <span>Histórico de valores ({history.length})</span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 pl-4 border-l-2 border-border">
          {history.map((entry, index) => {
            const previousEntry = history[index + 1];
            const variation = previousEntry 
              ? getVariation(entry.presented_value, previousEntry.presented_value)
              : 0;

            return (
              <div 
                key={entry.id} 
                className="flex items-start justify-between gap-2 py-1.5 text-xs"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {formatCurrency(entry.presented_value)}
                    </span>
                    {previousEntry && (
                      <span className={`flex items-center gap-0.5 ${
                        variation > 0 ? 'text-green-600' : variation < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {getTrendIcon(variation)}
                        <span>{Math.abs(variation).toFixed(1)}%</span>
                      </span>
                    )}
                    {index === 0 && (
                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                        Atual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {entry.consultant_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.consultant_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
