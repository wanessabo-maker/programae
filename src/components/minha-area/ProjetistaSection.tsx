import { useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  PenTool, 
  Ruler, 
  ChevronLeft, 
  ChevronRight,
  Users,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyProjectStats } from '@/hooks/useProjectEnvironments';

interface ProjetistaSectionProps {
  teamMemberId: string;
  teamMemberName: string;
}

export function ProjetistaSection({ teamMemberId, teamMemberName }: ProjetistaSectionProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const { data: stats, isLoading } = useMyProjectStats(teamMemberId, year, month);

  const handlePreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };

  // If no project data exists for this user, don't show the section
  if (!isLoading && !stats?.apresentacao && !stats?.tecnico && !stats?.received) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          Minha Produção de Projetos
        </h2>
        
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize min-w-[100px] text-center">
            {format(selectedDate, 'MMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Presentations Received (as consultant) */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-semibold">{stats?.received || 0}</p>
                )}
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Recebidas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Presentation Environments Produced */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded">
                <PenTool className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-semibold">{stats?.apresentacao || 0}</p>
                )}
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Apresentação
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Environments Produced */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded">
                <Ruler className="h-5 w-5 text-green-500" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-2xl font-semibold">{stats?.tecnico || 0}</p>
                )}
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Técnico
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {stats?.receivedActions && stats.receivedActions.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Apresentações Recebidas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {stats.receivedActions.slice(0, 5).map((action: any) => (
                <div 
                  key={action.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">
                      {action.professional?.name || 'Profissional'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {action.environment_count || 1} amb.
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(action.action_date), 'dd/MM', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
