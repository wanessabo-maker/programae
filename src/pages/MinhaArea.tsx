import { useState, useMemo } from 'react';
import { Clock, ListChecks, Loader2, KanbanSquare } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useUserAreas } from '@/hooks/useUserAreas';
import { usePositions } from '@/hooks/usePositions';
import {
  useMyAllChecklistItems,
  useAllProjectChecklistItems,
  ChecklistItemWithDetails,
} from '@/hooks/useChecklist';
import { useContractGroups } from '@/hooks/useContractGroups';
import { ContractGroupsGrid } from '@/components/minha-area/ContractGroupsGrid';
import { CompleteActivityModal } from '@/components/minha-area/CompleteActivityModal';
import { ProjetistaSection } from '@/components/minha-area/ProjetistaSection';
import { ProjetistaTecnicoProjects } from '@/components/minha-area/ProjetistaTecnicoProjects';
import { MeuCockpit } from '@/components/minha-area/MeuCockpit';
import { MeuCaminho } from '@/components/minha-area/MeuCaminho';
import { MeusIndicadoresAnuais } from '@/components/minha-area/MeusIndicadoresAnuais';
import { PlannerTab } from '@/components/comercial/PlannerTab';
import { ActionModal } from '@/components/ActionModal';
import { StaleProjectsBanner } from '@/components/minha-area/StaleProjectsBanner';

export default function MinhaArea() {
  const { user } = useAuthContext();
  const { data: currentTeamMember, isLoading: isLoadingMember } = useCurrentTeamMember();
  const { areas: userFunctionalAreas, isLoading: isLoadingAreas } = useUserAreas(user?.id || null);
  const { getMemberAreaIds, getAreaName, getMemberPositions } = usePositions();

  const [selectedItem, setSelectedItem] = useState<ChecklistItemWithDetails | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);

  const isProjetistaTecnico = useMemo(() => {
    if (!currentTeamMember?.id) return false;
    return getMemberPositions(currentTeamMember.id).some(p =>
      p.name.toLowerCase().includes('projetista técnico') ||
      p.name.toLowerCase().includes('projetista tecnico')
    );
  }, [currentTeamMember?.id, getMemberPositions]);

  const userAreaNames = useMemo(() => {
    if (!currentTeamMember?.id) return [];
    return getMemberAreaIds(currentTeamMember.id).map(id => getAreaName(id)).filter(Boolean);
  }, [currentTeamMember?.id, getMemberAreaIds, getAreaName]);

  const allUserAreas = useMemo(() => {
    const areas = new Set<string>();
    userFunctionalAreas.forEach(area => areas.add(area));
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

  const { data: myItems = [], isLoading: isLoadingItems } = useMyAllChecklistItems(
    allUserAreas,
    currentTeamMember?.id
  );

  const projectIds = useMemo(() => {
    const ids = new Set<string>();
    myItems.forEach(item => {
      const projectId = item.project?.id || (item as any).checklist?.project_id;
      if (projectId) ids.add(projectId);
    });
    return Array.from(ids);
  }, [myItems]);

  const { data: allProjectItems = [] } = useAllProjectChecklistItems(projectIds);

  // Safety filter: garante que o colaborador só veja as próprias etapas
  const visibleItems = useMemo(() => {
    const currentTeamMemberId = currentTeamMember?.id;
    if (!currentTeamMemberId) return [];

    return myItems.filter(item => {
      const assignedTo = (item as any).assigned_to as string | null | undefined;
      const projectResponsibleId = (item as any).project?.responsible_id as string | null | undefined;
      const assignedProjetistaId = (item as any).checklist?.assigned_projetista_id as string | null | undefined;
      const assignedLogisticaId = (item as any).checklist?.assigned_logistica_id as string | null | undefined;
      const assignedCsId = (item as any).checklist?.assigned_cs_id as string | null | undefined;

      if (assignedTo) return assignedTo === currentTeamMemberId;
      if (item.responsible_area === 'comercial') return projectResponsibleId === currentTeamMemberId;
      if (item.responsible_area === 'projetista_tecnico') return assignedProjetistaId === currentTeamMemberId;
      if (item.responsible_area === 'logistica') return assignedLogisticaId === currentTeamMemberId;
      if (item.responsible_area === 'cs') return assignedCsId === currentTeamMemberId;
      return false;
    });
  }, [myItems, currentTeamMember?.id]);

  const contractGroups = useContractGroups(visibleItems, allProjectItems as any);

  const totalActive = visibleItems.filter(item => item.status === 'active').length;
  const totalBlocked = visibleItems.filter(item => item.status === 'blocked').length;

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
        {/* Aviso de projetos parados */}
        {currentTeamMember?.id && <StaleProjectsBanner teamMemberId={currentTeamMember.id} />}

        {/* MEU MUNDO + 1 · Minhas Metas + Meus Alertas */}
        {currentTeamMember?.id && (
          <MeuCockpit
            teamMemberId={currentTeamMember.id}
            teamMemberName={currentTeamMember.name}
            isComercial={allUserAreas.includes('comercial')}
            isProjetos={allUserAreas.includes('projetos')}
            onRegistrarAcao={() => setActionModalOpen(true)}
          />
        )}

        {/* Produção de projetos, quando aplicável */}
        {currentTeamMember?.id && (
          <ProjetistaSection
            teamMemberId={currentTeamMember.id}
            teamMemberName={currentTeamMember.name}
          />
        )}

        {currentTeamMember?.id && isProjetistaTecnico && (
          <ProjetistaTecnicoProjects teamMemberId={currentTeamMember.id} />
        )}

        {/* 2 · MINHAS AÇÕES */}
        {currentTeamMember?.id && <MeuCaminho teamMemberId={currentTeamMember.id} />}

        {/* 3 · MEUS CONTRATOS */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
              3 · Meus Contratos ({contractGroups.length})
            </h2>
            {contractGroups.some(g => g.hasOverdue) && (
              <Badge variant="destructive" className="text-[10px]">
                {contractGroups.filter(g => g.hasOverdue).length} com etapa atrasada
              </Badge>
            )}
          </div>

          <ContractGroupsGrid
            groups={contractGroups}
            onCompleteItem={item => {
              setSelectedItem(item);
              setCompleteModalOpen(true);
            }}
            emptyTitle="Tudo em dia!"
            emptyDescription="Você não possui atividades pendentes no momento."
          />
        </div>

        {/* 4 · PIPELINE DE APRESENTAÇÕES */}
        {currentTeamMember?.id &&
          (allUserAreas.includes('comercial') || allUserAreas.includes('projetos')) && (
            <section className="space-y-3">
              <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-2">
                <KanbanSquare className="h-3.5 w-3.5" /> 4 · Pipeline de Apresentações — seus projetos em destaque
              </h3>
              <PlannerTab highlightMemberId={currentTeamMember.id} />
            </section>
          )}

        {/* 5 · MEUS INDICADORES */}
        {currentTeamMember?.id && <MeusIndicadoresAnuais teamMemberId={currentTeamMember.id} />}

        <ActionModal open={actionModalOpen} onOpenChange={setActionModalOpen} />
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
