import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { useIsManager } from '@/hooks/useIsManager';
import {
  useAllTeamChecklistItems,
  useAllProjectChecklistItems,
  ChecklistItemWithDetails,
} from '@/hooks/useChecklist';
import { useContractGroups } from '@/hooks/useContractGroups';
import { ContractGroupsGrid } from '@/components/minha-area/ContractGroupsGrid';
import { CompleteActivityModal } from '@/components/minha-area/CompleteActivityModal';
import { ManagementDashboard } from '@/components/minha-area/ManagementDashboard';
import { CleanlinessAdminPanel } from '@/components/minha-area/CleanlinessAdminPanel';
import GestoraDashboard from '@/pages/GestoraDashboard';
import IndicadoresTab from '@/components/comercial/IndicadoresTab';
import { useTeamMembers } from '@/hooks/useDatabase';

export default function Gestao() {
  const { isAdmin, canAccessGestao, isLoading: isLoadingPerms } = useIsManager();
  const { data: allTeamMembersData = [] } = useTeamMembers();

  const [teamFilterMemberId, setTeamFilterMemberId] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ChecklistItemWithDetails | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  const { data: allTeamItems = [], isLoading: isLoadingItems } = useAllTeamChecklistItems(canAccessGestao);

  const filteredItems = useMemo(() => {
    if (!teamFilterMemberId) return allTeamItems;
    return allTeamItems.filter(item => {
      const assignedTo = (item as any).assigned_to;
      if (assignedTo) return assignedTo === teamFilterMemberId;

      switch (item.responsible_area) {
        case 'comercial':
          return (item as any).project?.responsible_id === teamFilterMemberId;
        case 'projetista_tecnico':
          return (item as any).checklist?.assigned_projetista_id === teamFilterMemberId;
        case 'logistica':
          return (item as any).checklist?.assigned_logistica_id === teamFilterMemberId;
        case 'cs':
          return (item as any).checklist?.assigned_cs_id === teamFilterMemberId;
        default:
          return false;
      }
    });
  }, [allTeamItems, teamFilterMemberId]);

  const projectIds = useMemo(() => {
    const ids = new Set<string>();
    filteredItems.forEach(item => {
      const projectId = item.project?.id || (item as any).checklist?.project_id;
      if (projectId) ids.add(projectId);
    });
    return Array.from(ids);
  }, [filteredItems]);

  const { data: allProjectItems = [] } = useAllProjectChecklistItems(projectIds);
  const contractGroups = useContractGroups(filteredItems, allProjectItems as any);

  const activeTeamMembers = useMemo(
    () => allTeamMembersData.filter((m: any) => m.active).sort((a: any, b: any) => a.name.localeCompare(b.name)),
    [allTeamMembersData]
  );

  if (isLoadingPerms) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!canAccessGestao) {
    return <Navigate to="/minha-area" replace />;
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-light tracking-tight">Gestão</h1>
          <p className="text-muted-foreground text-sm">
            Visão geral da equipe, funil do mês e indicadores por colaborador
          </p>
        </div>

        {/* Visão Geral da Equipe */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
              Contratos da Equipe ({contractGroups.length})
            </h2>
            {contractGroups.some(g => g.hasOverdue) && (
              <Badge variant="destructive" className="text-[10px]">
                {contractGroups.filter(g => g.hasOverdue).length} com etapa atrasada
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <select
              value={teamFilterMemberId}
              onChange={e => setTeamFilterMemberId(e.target.value)}
              className="input-flat text-sm max-w-xs"
            >
              <option value="">Todos os colaboradores</option>
              {activeTeamMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {teamFilterMemberId && (
              <button
                onClick={() => setTeamFilterMemberId('')}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Limpar
              </button>
            )}
          </div>

          {isLoadingItems ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando contratos da equipe...
            </div>
          ) : (
            <ContractGroupsGrid
              groups={contractGroups}
              onCompleteItem={item => {
                setSelectedItem(item);
                setCompleteModalOpen(true);
              }}
              emptyTitle="Nenhum contrato ativo"
              emptyDescription="Não há contratos com atividades pendentes no momento."
            />
          )}
        </section>

        {/* Gestora — apenas admin */}
        {isAdmin && <GestoraDashboard />}

        {/* Indicadores por colaborador */}
        <ManagementDashboard />

        <section className="space-y-4">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
            Indicadores de Performance Comercial
          </h2>
          <IndicadoresTab />
        </section>

        {/* Painel de limpeza em tempo real — apenas admin */}
        {isAdmin && <CleanlinessAdminPanel />}
      </div>

      <CompleteActivityModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        item={selectedItem}
        onClose={() => {
          setSelectedItem(null);
          setCompleteModalOpen(false);
        }}
      />
    </Layout>
  );
}