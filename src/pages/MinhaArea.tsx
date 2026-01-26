import { useState, useMemo } from 'react';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  User, 
  Building2,
  ChevronRight,
  ListChecks,
  Loader2
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useUserAreas } from '@/hooks/useUserAreas';
import { usePositions } from '@/hooks/usePositions';
import { 
  useMyActiveChecklistItems, 
  getResponsibleAreaLabel,
  getWorkflowStatusLabel,
  ChecklistItemWithDetails
} from '@/hooks/useChecklist';
import { CompleteActivityModal } from '@/components/minha-area/CompleteActivityModal';

export default function MinhaArea() {
  const { user } = useAuthContext();
  const { data: currentTeamMember, isLoading: isLoadingMember } = useCurrentTeamMember();
  const { areas: userFunctionalAreas, isLoading: isLoadingAreas } = useUserAreas(user?.id || null);
  const { getMemberAreaIds, getAreaName } = usePositions();
  
  const [selectedItem, setSelectedItem] = useState<ChecklistItemWithDetails | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  // Get user's areas from positions
  const userAreaNames = useMemo(() => {
    if (!currentTeamMember?.id) return [];
    const areaIds = getMemberAreaIds(currentTeamMember.id);
    return areaIds.map(id => getAreaName(id)).filter(Boolean);
  }, [currentTeamMember?.id, getMemberAreaIds, getAreaName]);

  // Combine functional areas with position areas for filtering
  const allUserAreas = useMemo(() => {
    const areas = new Set<string>();
    
    // Add functional areas
    userFunctionalAreas.forEach(area => areas.add(area));
    
    // Add position-based areas (map to functional area names)
    userAreaNames.forEach(name => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('comercial')) areas.add('comercial');
      if (lowerName.includes('projeto')) areas.add('projetos');
      if (lowerName.includes('customer') || lowerName.includes('success') || lowerName.includes('cs')) {
        areas.add('customer_success');
      }
      if (lowerName.includes('assist') || lowerName.includes('técnica') || lowerName.includes('logist')) {
        areas.add('assistencia_tecnica');
      }
    });
    
    return Array.from(areas);
  }, [userFunctionalAreas, userAreaNames]);

  const { data: activeItems = [], isLoading: isLoadingItems } = useMyActiveChecklistItems(
    allUserAreas, 
    currentTeamMember?.id
  );

  const handleOpenCompleteModal = (item: ChecklistItemWithDetails) => {
    setSelectedItem(item);
    setCompleteModalOpen(true);
  };

  const handleCloseCompleteModal = () => {
    setSelectedItem(null);
    setCompleteModalOpen(false);
  };

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return { status: 'none', label: 'Sem prazo', color: 'text-muted-foreground' };
    
    const date = parseISO(dueDate);
    const daysUntil = differenceInDays(date, new Date());
    
    if (isPast(date) && !isToday(date)) {
      return { 
        status: 'overdue', 
        label: `Atrasado (${Math.abs(daysUntil)} dias)`, 
        color: 'text-destructive' 
      };
    }
    if (isToday(date)) {
      return { status: 'today', label: 'Vence hoje', color: 'text-orange-600' };
    }
    if (daysUntil <= 2) {
      return { status: 'soon', label: `Vence em ${daysUntil} dias`, color: 'text-orange-500' };
    }
    return { 
      status: 'ok', 
      label: format(date, "dd/MM/yyyy", { locale: ptBR }), 
      color: 'text-muted-foreground' 
    };
  };

  const isLoading = isLoadingMember || isLoadingAreas || isLoadingItems;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Carregando suas atividades...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-light tracking-tight">
            Olá, {currentTeamMember?.name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="text-muted-foreground">
            Suas atividades pendentes do workflow de contratos
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded">
                  <ListChecks className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{activeItems.length}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Atividades Pendentes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {activeItems.filter(i => i.due_date && isPast(parseISO(i.due_date)) && !isToday(parseISO(i.due_date))).length}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Atrasadas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {activeItems.filter(i => i.due_date && isToday(parseISO(i.due_date))).length}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Vencem Hoje
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities List */}
        <div className="space-y-4">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
            Minhas Atividades
          </h2>

          {activeItems.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Tudo em dia!</h3>
                <p className="text-muted-foreground text-sm">
                  Você não possui atividades pendentes no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeItems.map((item) => {
                const dueDateStatus = getDueDateStatus(item.due_date);
                
                return (
                  <Card 
                    key={item.id} 
                    className={`border-border hover:border-primary/50 transition-colors cursor-pointer ${
                      dueDateStatus.status === 'overdue' ? 'border-l-4 border-l-destructive' : ''
                    }`}
                    onClick={() => handleOpenCompleteModal(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Activity Name */}
                          <h3 className="font-medium mb-1 truncate">{item.name}</h3>
                          
                          {/* Contract / Client Info */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                            {item.project?.clients?.name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {item.project.clients.name}
                              </span>
                            )}
                            {item.project?.focco_project_number && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                FOCCO {item.project.focco_project_number}
                              </span>
                            )}
                            {item.project?.name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {item.project.name}
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getResponsibleAreaLabel(item.responsible_area)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Etapa {item.step_order}/18
                            </Badge>
                            {item.checklist?.workflow_status && (
                              <Badge variant="secondary" className="text-xs bg-primary/10">
                                {getWorkflowStatusLabel(item.checklist.workflow_status)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Right Side - Due Date & Action */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`text-xs ${dueDateStatus.color}`}>
                            {dueDateStatus.label}
                          </span>
                          <Button size="sm" className="gap-1">
                            Registrar Ação
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Complete Activity Modal */}
      <CompleteActivityModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        item={selectedItem}
        onClose={handleCloseCompleteModal}
      />
    </Layout>
  );
}
