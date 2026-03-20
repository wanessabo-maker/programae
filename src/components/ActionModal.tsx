import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryForAction, shouldUpdateProfessionalCategory } from '@/hooks/useProfessionalCategory';
import { findProjectByFocco } from '@/hooks/useProjects';
import { createClientDirect } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { SmartClientFields } from '@/components/SmartClientFields';
import { SmartClientData, updateClientData } from '@/hooks/useSmartClientData';
import { safeNumber, safeParseInt } from '@/lib/validators';
import { useCSContactSchedules, generateCSActionsForCase } from '@/hooks/useCustomerSuccess';
import { createChecklistForProject } from '@/hooks/useChecklist';
import { useCreateProjectEnvironment } from '@/hooks/useProjectEnvironments';
interface ActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  consultantId: string;
  professionalId: string;
  actionTypeId: string;
  date: string;
  value: string;
  // Smart client fields
  clientName: string;
  clientAge: string;
  clientProfession: string;
  presentationNumber: string;
  foccoProjectNumber: string;
  contractNumber: string;
  clientPhone: string;
  clientEmail: string;
  clientCpfCnpj: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  presentedValue: string;
  // Assigned professionals for checklist
  assignedProjetistaId: string;
  assignedLogisticaId: string;
  // Project environments (for Projeto de Apresentação)
  environmentCount: string;
  // Commercial consultant served (for Projetista de Apresentação)
  commercialConsultantId: string;
}

const initialFormState: FormState = {
  consultantId: '',
  professionalId: '',
  actionTypeId: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  value: '',
  clientName: '',
  clientAge: '',
  clientProfession: '',
  presentationNumber: '',
  foccoProjectNumber: '',
  contractNumber: '',
  clientPhone: '',
  clientEmail: '',
  clientCpfCnpj: '',
  clientAddress: '',
  clientCity: '',
  clientState: '',
  presentedValue: '',
  assignedProjetistaId: '',
  assignedLogisticaId: '',
  environmentCount: '',
  commercialConsultantId: '',
};

export function ActionModal({ open, onOpenChange }: ActionModalProps) {
  const { 
    teamMembers, 
    professionals, 
    professionalTypes,
    professionalCategories,
    actionTypes,
    
    addAction, 
    addProfessional,
    addCreditTransaction,
    updateProfessional,
    addReminder,
  } = useApp();

  // Auth context and current team member for role-based consultant selection
  const { isAdmin } = useAuthContext();
  const { data: currentTeamMember } = useCurrentTeamMember();

  // CS schedules for automatic case creation
  const { data: csSchedules } = useCSContactSchedules();
  
  // Project environments creation
  const createEnvironment = useCreateProjectEnvironment();

  const activeMembers = teamMembers.filter(m => m.active);

  // Check if current user is a Projetista (from Projetos area - should see consultant selector instead of specifier)
  const [isUserFromProjetosArea, setIsUserFromProjetosArea] = useState(false);
  const [isUserProjetistaTecnico, setIsUserProjetistaTecnico] = useState(false);

  // Commercial consultants for selection by Projetistas
  const [commercialConsultants, setCommercialConsultants] = useState<{ id: string; name: string }[]>([]);

  // Fetch team members with specific positions for assignment
  const [projetistaMembers, setProjetistaMembers] = useState<{ id: string; name: string }[]>([]);
  const [logisticaMembers, setLogisticaMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchPositionMembers = async () => {
      try {
        const { data: positions } = await supabase
          .from('positions')
          .select('id, name')
          .eq('is_active', true)
          .or('name.ilike.%projetista técnico%,name.ilike.%projetista tecnico%,name.ilike.%logistica%,name.ilike.%logística%');

        if (!positions || positions.length === 0) return;

        const projetistaPos = positions.find(p => 
          p.name.toLowerCase().includes('projetista técnico') || 
          p.name.toLowerCase().includes('projetista tecnico')
        );
        const logisticaPos = positions.find(p => 
          p.name.toLowerCase().includes('logistica') || 
          p.name.toLowerCase().includes('logística')
        );

        const positionIds = [projetistaPos?.id, logisticaPos?.id].filter(Boolean);
        if (positionIds.length === 0) return;

        const { data: memberPositions } = await supabase
          .from('team_member_positions')
          .select('team_member_id, position_id')
          .in('position_id', positionIds);

        if (!memberPositions) return;

        const projetistaIds = memberPositions
          .filter(mp => mp.position_id === projetistaPos?.id)
          .map(mp => mp.team_member_id);
        
        const logisticaIds = memberPositions
          .filter(mp => mp.position_id === logisticaPos?.id)
          .map(mp => mp.team_member_id);

        const allMemberIds = [...new Set([...projetistaIds, ...logisticaIds])];
        if (allMemberIds.length === 0) return;

        const { data: members } = await supabase
          .from('team_members')
          .select('id, name')
          .in('id', allMemberIds)
          .eq('active', true);

        if (!members) return;

        setProjetistaMembers(members.filter(m => projetistaIds.includes(m.id)));
        setLogisticaMembers(members.filter(m => logisticaIds.includes(m.id)));
      } catch (error) {
        console.error('Error fetching position members:', error);
      }
    };

    fetchPositionMembers();
  }, []);

  // User's areas based on their positions (for filtering action types)
  const [userAreaIds, setUserAreaIds] = useState<string[]>([]);

  // Selected consultant's areas (for admin filtering action types by selected collaborator)
  const [selectedConsultantAreaIds, setSelectedConsultantAreaIds] = useState<string[]>([]);

  // Whether the selected consultant (when admin) is a Projetista de Apresentação
  const [isSelectedConsultantProjetista, setIsSelectedConsultantProjetista] = useState(false);
  const [isSelectedConsultantProjetistaTecnico, setIsSelectedConsultantProjetistaTecnico] = useState(false);

  useEffect(() => {
    const fetchUserAreas = async () => {
      if (!currentTeamMember?.id) {
        setUserAreaIds([]);
        return;
      }

      try {
        // Get positions for this team member with area_id
        const { data: memberPositions } = await supabase
          .from('team_member_positions')
          .select(`
            position_id,
            positions!inner(id, area_id)
          `)
          .eq('team_member_id', currentTeamMember.id);

        if (memberPositions) {
          const areaIds = memberPositions
            .map((mp: any) => mp.positions?.area_id)
            .filter(Boolean);
          setUserAreaIds([...new Set(areaIds)]);
        }
      } catch (error) {
        console.error('Error fetching user areas:', error);
      }
    };

    fetchUserAreas();
  }, [currentTeamMember?.id]);

  // Filter action types based on the SELECTED consultant's areas (not the logged-in user)
  const filteredActionTypes = useMemo(() => {
    // Determine which area IDs to use for filtering
    const effectiveAreaIds = isAdmin ? selectedConsultantAreaIds : userAreaIds;
    
    // If no areas resolved (e.g. no consultant selected yet), show all
    if (effectiveAreaIds.length === 0) {
      return actionTypes;
    }

    // Show action types that match the consultant's areas OR have no area assigned
    return actionTypes.filter(at => {
      if (!at.areaId) return true; // Action types without area are visible to everyone
      return effectiveAreaIds.includes(at.areaId);
    });
  }, [actionTypes, selectedConsultantAreaIds, userAreaIds, isAdmin]);

  // Check if current user is "Projetista de Apresentação" specifically
  // They should see Commercial Consultant field instead of Especificador
  useEffect(() => {
    const checkProjetistaApresentacaoAndFetchConsultants = async () => {
      if (!currentTeamMember?.id) {
        setIsUserFromProjetosArea(false);
        return;
      }

      try {
        // Get positions for this team member with area info
        const { data: memberPositions } = await supabase
          .from('team_member_positions')
          .select(`
            position_id,
            positions!inner(id, name, area, area_id)
          `)
          .eq('team_member_id', currentTeamMember.id);

          if (memberPositions) {
          // Check if user has "Projetista de Apresentação" position specifically
          const isProjetistaApresentacao = memberPositions.some(
            (mp: any) => 
              mp.positions?.name?.toLowerCase().includes('projetista de apresentação') ||
              mp.positions?.name?.toLowerCase().includes('projetista apresentação')
          );
          setIsUserFromProjetosArea(isProjetistaApresentacao);

          // Check if user has "Projetista Técnico" position
          const isProjetistaTec = memberPositions.some(
            (mp: any) => 
              mp.positions?.name?.toLowerCase().includes('projetista técnico') ||
              mp.positions?.name?.toLowerCase().includes('projetista tecnico')
          );
          setIsUserProjetistaTecnico(isProjetistaTec);

          // If is Projetista de Apresentação or Projetista Técnico, fetch commercial consultants
          if (isProjetistaApresentacao || isProjetistaTec) {
            // Get "Consultor Comercial" position specifically
            const { data: comercialPosition } = await supabase
              .from('positions')
              .select('id')
              .eq('is_active', true)
              .ilike('name', '%consultor comercial%')
              .not('name', 'ilike', '%engenharia%'); // Exclude "Consultor Comercial Engenharia"

            if (comercialPosition && comercialPosition.length > 0) {
              const comercialPositionIds = comercialPosition.map(p => p.id);
              
              // Get team members with these positions
              const { data: comercialMemberPositions } = await supabase
                .from('team_member_positions')
                .select('team_member_id')
                .in('position_id', comercialPositionIds);

              if (comercialMemberPositions && comercialMemberPositions.length > 0) {
                const comercialMemberIds = [...new Set(comercialMemberPositions.map(mp => mp.team_member_id))];
                
                const { data: comercialMembers } = await supabase
                  .from('team_members')
                  .select('id, name')
                  .in('id', comercialMemberIds)
                  .eq('active', true)
                  .order('name');

                setCommercialConsultants(comercialMembers || []);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking Projetista de Apresentação position:', error);
      }
    };

    checkProjetistaApresentacaoAndFetchConsultants();
  }, [currentTeamMember?.id]);

  const [form, setForm] = useState<FormState>(initialFormState);
  const [isNewProfessional, setIsNewProfessional] = useState(false);
  const [newProfessional, setNewProfessional] = useState({
    name: '',
    typeId: '',
  });
  const [specialDate, setSpecialDate] = useState({
    date: '',
    reason: '',
    type: 'anual' as 'unica' | 'mensal' | 'anual',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [loadedClientData, setLoadedClientData] = useState<SmartClientData | null>(null);

  // Auto-select consultant for non-admin users when modal opens
  useEffect(() => {
    if (open && !isAdmin && currentTeamMember?.id && form.consultantId === '') {
      setForm(prev => ({ ...prev, consultantId: currentTeamMember.id }));
    }
  }, [open, isAdmin, currentTeamMember?.id, form.consultantId]);

  // Fetch selected consultant's areas and check if they are Projetista de Apresentação (admin flow)
  useEffect(() => {
    const fetchSelectedConsultantAreas = async () => {
      const consultantId = form.consultantId;
      if (!consultantId) {
        setSelectedConsultantAreaIds([]);
        setIsSelectedConsultantProjetista(false);
        return;
      }

      try {
        const { data: memberPositions } = await supabase
          .from('team_member_positions')
          .select(`
            position_id,
            positions!inner(id, area_id, name)
          `)
          .eq('team_member_id', consultantId);

        if (memberPositions) {
          const areaIds = memberPositions
            .map((mp: any) => mp.positions?.area_id)
            .filter(Boolean);
          setSelectedConsultantAreaIds([...new Set(areaIds)]);

          // Check if this consultant is a Projetista de Apresentação
          const isProjetista = memberPositions.some(
            (mp: any) =>
              mp.positions?.name?.toLowerCase().includes('projetista de apresentação') ||
              mp.positions?.name?.toLowerCase().includes('projetista apresentação')
          );
          setIsSelectedConsultantProjetista(isProjetista);

          // Check if this consultant is a Projetista Técnico
          const isProjetistaTec = memberPositions.some(
            (mp: any) =>
              mp.positions?.name?.toLowerCase().includes('projetista técnico') ||
              mp.positions?.name?.toLowerCase().includes('projetista tecnico')
          );
          setIsSelectedConsultantProjetistaTecnico(isProjetistaTec);

          // If selected consultant is a projetista (apresentação or técnico), fetch commercial consultants for the dropdown
          if ((isProjetista || isProjetistaTec) && commercialConsultants.length === 0) {
            const { data: comercialPosition } = await supabase
              .from('positions')
              .select('id')
              .eq('is_active', true)
              .ilike('name', '%consultor comercial%')
              .not('name', 'ilike', '%engenharia%');

            if (comercialPosition && comercialPosition.length > 0) {
              const comercialPositionIds = comercialPosition.map(p => p.id);
              const { data: comercialMemberPositions } = await supabase
                .from('team_member_positions')
                .select('team_member_id')
                .in('position_id', comercialPositionIds);

              if (comercialMemberPositions && comercialMemberPositions.length > 0) {
                const comercialMemberIds = [...new Set(comercialMemberPositions.map(mp => mp.team_member_id))];
                const { data: comercialMembers } = await supabase
                  .from('team_members')
                  .select('id, name')
                  .in('id', comercialMemberIds)
                  .eq('active', true)
                  .order('name');

                setCommercialConsultants(comercialMembers || []);
              }
            }
          }
        } else {
          setSelectedConsultantAreaIds([]);
          setIsSelectedConsultantProjetista(false);
          setIsSelectedConsultantProjetistaTecnico(false);
        }
      } catch (error) {
        console.error('Error fetching selected consultant areas:', error);
        setSelectedConsultantAreaIds([]);
        setIsSelectedConsultantProjetista(false);
        setIsSelectedConsultantProjetistaTecnico(false);
      }
    };

    fetchSelectedConsultantAreas();
  }, [form.consultantId]);


  const selectedActionType = actionTypes.find(t => t.id === form.actionTypeId);
  const consultantProfessionals = professionals.filter(p => p.consultantId === form.consultantId);
  
  // Effective check: is the selected consultant (or logged-in user if not admin) a Projetista de Apresentação
  const isEffectiveProjetista = isAdmin ? isSelectedConsultantProjetista : isUserFromProjetosArea;
  
  // Effective check: is the selected consultant (or logged-in user if not admin) a Projetista Técnico
  const isEffectiveProjetistaTecnico = isAdmin ? isSelectedConsultantProjetistaTecnico : isUserProjetistaTecnico;
  
  // Check if this is an "Apresentação de Projeto" action type (but NOT "Reforma")
  const isApresentacaoProjeto = selectedActionType?.name?.toLowerCase().includes('apresentação') && 
    selectedActionType?.name?.toLowerCase().includes('projeto') &&
    !selectedActionType?.name?.toLowerCase().includes('reforma');
  
  // Check if this is a "Venda" action type
  const isVenda = selectedActionType?.classification === 'venda';
  
  // Check if this is a "Venda - Aditivo" (adds value to existing contract, no new checklist)
  const isVendaAditivo = isVenda && selectedActionType?.name?.toLowerCase().includes('aditivo');
  
  // Check if this is a "Seletiva" action type (e.g., Assinatura de Certificado de Garantia)
  const isSeletiva = selectedActionType?.classification === 'seletiva';
  
  // Check if this is a "Projeto" classification (Projeto Técnico)
  const isProjeto = selectedActionType?.classification === 'projeto';
  
  // Action types where ALL fields must be mandatory
  const isStrictValidationType = isApresentacaoProjeto || isVenda || isSeletiva || isProjeto;

  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  }, [errors]);

  const handleBulkUpdate = useCallback((data: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...data }));
  }, []);

  const handleClientDataLoaded = useCallback((data: SmartClientData) => {
    setLoadedClientData(data);
  }, []);

  // Map of field keys to form field names
  const fieldToFormKeyMap: Record<string, keyof FormState> = {
    clientName: 'clientName',
    clientAge: 'clientAge',
    clientProfession: 'clientProfession',
    presentationNumber: 'presentationNumber',
    foccoProjectNumber: 'foccoProjectNumber',
    contractNumber: 'contractNumber',
    clientPhone: 'clientPhone',
    clientEmail: 'clientEmail',
    clientCpfCnpj: 'clientCpfCnpj',
    clientAddress: 'clientAddress',
    clientCity: 'clientCity',
    clientState: 'clientState',
    presentedValue: 'presentedValue',
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    
    // Base required fields
    if (!form.consultantId) newErrors.consultantId = true;
    if (!form.actionTypeId) newErrors.actionTypeId = true;
    if (!form.date) newErrors.date = true;
    
    // For strict validation types (Apresentação, Venda, Seletiva, Projeto), 
    // professional (especificador) is required unless user is Projetista de Apresentação
    // professionalId is optional - "Sem Especificador" is always allowed
    
    // Client Name, Age, and Profession are required for client-creating action types
    // But NOT for Venda Aditivo (which only updates existing contract)
    // Only validate fields that are actually enabled/visible in the form
    if ((isApresentacaoProjeto || (isVenda && !isVendaAditivo) || isSeletiva)) {
      const ef = selectedActionType?.enabledFields || [];
      const hasEnabledFields = ef.length > 0;
      if (!hasEnabledFields || ef.includes('clientName' as any)) {
        if (!form.clientName.trim()) newErrors.clientName = true;
      }
      if (!hasEnabledFields || ef.includes('clientAge' as any)) {
        if (!form.clientAge.trim()) newErrors.clientAge = true;
      }
      if (!hasEnabledFields || ef.includes('clientProfession' as any)) {
        if (!form.clientProfession.trim()) newErrors.clientProfession = true;
      }
    }
    
    // FOCCO number is required for Apresentação de Projeto, Venda (including Aditivo), and Projeto
    if ((isApresentacaoProjeto || isVenda || isProjeto) && !form.foccoProjectNumber.trim()) {
      newErrors.foccoProjectNumber = true;
    }
    
    // Environment count is required for Apresentação de Projeto (Projetista de Apresentação) OR Projeto Técnico (Projetista Técnico)
    const requiresEnvironment = (isApresentacaoProjeto && isEffectiveProjetista) || (isProjeto && isEffectiveProjetistaTecnico);
    if (requiresEnvironment && (!form.environmentCount || (safeParseInt(form.environmentCount, { min: 1 }) === null))) {
      newErrors.environmentCount = true;
    }
    
    // Commercial consultant is required for Projetista de Apresentação or Projetista Técnico
    const requiresCommercialConsultant = (isApresentacaoProjeto && isEffectiveProjetista) || (isProjeto && isEffectiveProjetistaTecnico);
    if (requiresCommercialConsultant && !form.commercialConsultantId) {
      newErrors.commercialConsultantId = true;
    }
    
    // Contract number is required for Seletiva (e.g., Assinatura Certificado)
    if (isSeletiva && !form.contractNumber.trim()) {
      newErrors.contractNumber = true;
    }
    
    // For Venda (but NOT Aditivo), checklist assignment is mandatory
    if (isVenda && !isVendaAditivo) {
      if (!form.assignedProjetistaId) newErrors.assignedProjetistaId = true;
      if (!form.assignedLogisticaId) newErrors.assignedLogisticaId = true;
    }
    
    // Validate all enabled fields (marked as required in action type configuration)
    // For strict validation types, ALL enabled fields are mandatory
    if (selectedActionType?.additionalFields && selectedActionType?.enabledFields) {
      selectedActionType.enabledFields.forEach((fieldKey) => {
        const formKey = fieldToFormKeyMap[fieldKey];
        if (formKey) {
          const value = form[formKey];
          if (typeof value === 'string' && !value.trim()) {
            newErrors[fieldKey] = true;
          }
        }
      });
    }
    
    if (isNewProfessional) {
      if (!newProfessional.name) newErrors.professionalName = true;
      if (!newProfessional.typeId) newErrors.professionalType = true;
      if (professionalCategories.length === 0) {
        newErrors.noCategories = true;
      }
    }
    
    if (selectedActionType?.requiresValue && selectedActionType.requiresValue !== 'nenhum' && !form.value) {
      newErrors.value = true;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) return;
    
    // Check for no categories first
    if (isNewProfessional && professionalCategories.length === 0) {
      toast.error('Configure pelo menos uma Categoria de Profissional no Setup antes de registrar novos profissionais');
      return;
    }
    
    if (!validateForm()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Handle "Sem Especificador" - treat 'none' as no professional
      let professionalId = form.professionalId === 'none' ? '' : form.professionalId;

      // Determine the category based on action type
      const targetCategory = selectedActionType 
        ? getCategoryForAction(selectedActionType, professionalCategories)
        : null;

      // Create new professional if needed
      if (isNewProfessional && newProfessional.name && newProfessional.typeId) {
        // Check if professional with same name already exists for this consultant
        const existingProfessional = professionals.find(
          p => p.name.toLowerCase().trim() === newProfessional.name.toLowerCase().trim() && 
               p.consultantId === form.consultantId
        );
        
        if (existingProfessional) {
          // Use existing professional instead of creating duplicate
          professionalId = existingProfessional.id;
          toast.info(`Profissional "${newProfessional.name}" já existe e foi selecionado automaticamente`);
        } else {
          const newId = await addProfessional({
            name: newProfessional.name,
            typeId: newProfessional.typeId,
            consultantId: form.consultantId,
            categoryId: targetCategory?.id || professionalCategories[0]?.id || '',
            lastActionDate: form.date,
            lastActionTypeId: selectedActionType?.id,
          });
          
          if (!newId) {
            toast.error('Erro ao criar profissional');
            setIsSubmitting(false);
            return;
          }
          
          professionalId = newId;
        }

        // Create reminder for special date if provided (only for new professionals)
        if (specialDate.date && specialDate.reason && !existingProfessional) {
          addReminder({
            title: `${specialDate.reason} - ${newProfessional.name}`,
            date: specialDate.date,
            consultantId: form.consultantId,
            type: specialDate.type === 'unica' ? 'avulso' : 'recorrente',
            professionalId: professionalId,
          });
          toast.success(`Lembrete criado para ${specialDate.reason}`);
        }
      } else if (professionalId && professionalId !== '') {
        // Check if we should update the professional's category tracking
        const existingProfessional = professionals.find(p => p.id === professionalId);
        
        if (existingProfessional && selectedActionType) {
          const shouldUpdate = shouldUpdateProfessionalCategory(
            existingProfessional,
            selectedActionType,
            professionalCategories,
            actionTypes,
            form.date
          );

          if (shouldUpdate) {
            updateProfessional(professionalId, {
              lastActionDate: form.date,
              lastActionTypeId: selectedActionType?.id,
              categoryId: targetCategory?.id,
            });
          }
        }
      }

      // For Projetista de Apresentação or Projetista Técnico: points = environment count (1 ambiente = 1 ponto)
      // For other users: use action type's configured points
      // BUT only if the action type has points configured (points > 0) — e.g. "Reforma" has 0 points and should NOT score
      const actionTypeHasPoints = (selectedActionType?.programPoints || 0) > 0;
      const isProjetistaEnvironmentAction = actionTypeHasPoints && (
        (isApresentacaoProjeto && isEffectiveProjetista && form.environmentCount) ||
        (isProjeto && isEffectiveProjetistaTecnico && form.environmentCount));
      // Calculate points: base + bonus if professional is linked (for relacionamento/venda)
      const basePoints = isProjetistaEnvironmentAction
        ? (safeParseInt(form.environmentCount, { min: 0 }) ?? 0)
        : (selectedActionType?.programPoints || 0);
      const hasProfessionalBonus = professionalId && 
        selectedActionType?.bonusPointsWithProfessional && 
        selectedActionType.bonusPointsWithProfessional > 0 &&
        ['relacionamento', 'venda'].includes(selectedActionType?.classification || '');
      const points = basePoints + (hasProfessionalBonus ? selectedActionType.bonusPointsWithProfessional : 0);

      // Handle automatic project/client creation for Apresentação de Projeto
      let projectId: string | undefined = undefined;
      let clientId: string | null = loadedClientData?.clientId || null;
      
      if (isApresentacaoProjeto && form.foccoProjectNumber.trim()) {
        const foccoNumber = form.foccoProjectNumber.trim();
        
        try {
          const existingProject = await findProjectByFocco(foccoNumber);
          
          if (existingProject) {
            projectId = existingProject.id;
            
            // Update existing project with new presented value (always use latest)
            if (form.presentedValue) {
              const presentedValueNum = safeNumber(form.presentedValue, { min: 0 });
              
              if (presentedValueNum !== null) {
                await supabase
                  .from('projects')
                  .update({ estimated_value: presentedValueNum })
                  .eq('id', existingProject.id);
                
                // Save to value history
                await supabase
                  .from('project_value_history')
                  .insert({
                    project_id: existingProject.id,
                    presented_value: presentedValueNum,
                    consultant_id: form.consultantId,
                  });
              }
            }
            
            // Update existing client with any new data (progressive filling)
            if (existingProject.client_id) {
              clientId = existingProject.client_id;
              await updateClientData(existingProject.client_id, {
                name: form.clientName.trim() || undefined,
                cpf_cnpj: form.clientCpfCnpj.trim() || undefined,
                phone: form.clientPhone.trim() || undefined,
                email: form.clientEmail.trim() || undefined,
                address: form.clientAddress.trim() || undefined,
                city: form.clientCity.trim() || undefined,
                state: form.clientState.trim() || undefined,
                    age: safeParseInt(form.clientAge, { min: 0, max: 150 }) ?? undefined,
                    profession: form.clientProfession.trim() || undefined,
                  });
            }
            toast.info(`Ação vinculada ao projeto FOCCO ${foccoNumber} existente`);
          } else {
            // Create new client if data provided
            if (form.clientName.trim()) {
              clientId = await createClientDirect({
                name: form.clientName.trim(),
                age: safeParseInt(form.clientAge, { min: 0, max: 150 }),
                profession: form.clientProfession || null,
                professional_id: professionalId || null,
                responsible_id: form.consultantId,
                created_by: form.consultantId,
                status: 'apresentado',
              });
              
              // Update client with additional data
              if (clientId) {
                await updateClientData(clientId, {
                  cpf_cnpj: form.clientCpfCnpj.trim() || undefined,
                  phone: form.clientPhone.trim() || undefined,
                  email: form.clientEmail.trim() || undefined,
                  address: form.clientAddress.trim() || undefined,
                  city: form.clientCity.trim() || undefined,
                  state: form.clientState.trim() || undefined,
                });
              }
            }
            
            // Create new project
            const { data: newProject, error: projectError } = await supabase
              .from('projects')
              .insert({
                name: `Projeto FOCCO ${foccoNumber}`,
                focco_project_number: foccoNumber,
                professional_id: professionalId || null,
                responsible_id: form.consultantId,
                created_by: form.consultantId,
                client_id: clientId,
                stage: 'em_negociacao',
                start_date: form.date,
                estimated_value: safeNumber(form.presentedValue, { min: 0 }),
                origin_type: 'standard', // Normal flow - Apresentação creates project
              })
              .select('id')
              .single();
            
            if (projectError) {
              console.error('Error creating project:', projectError);
              toast.error('Erro ao criar projeto automaticamente');
            } else if (newProject) {
              projectId = newProject.id;
              
              // Save initial value to history if provided
              if (form.presentedValue) {
                await supabase
                  .from('project_value_history')
                  .insert({
                    project_id: newProject.id,
                    presented_value: safeNumber(form.presentedValue, { min: 0 }) ?? 0,
                    consultant_id: form.consultantId,
                  });
              }
              
              toast.success(`Projeto FOCCO ${foccoNumber} criado automaticamente`);
            }
          }
        } catch (err) {
          console.error('Error in project creation flow:', err);
        }
      }

      // Handle Venda Aditivo - just update existing project value, no new checklist
      if (isVendaAditivo) {
        const foccoNumber = form.foccoProjectNumber.trim();
        
        try {
          if (foccoNumber) {
            const existingProject = await findProjectByFocco(foccoNumber);
            
            if (existingProject) {
              projectId = existingProject.id;
              clientId = existingProject.client_id || null;
              
              // Add the aditivo value to the existing closed_value
              const aditivoValue = safeNumber(form.value, { min: 0 }) ?? 0;
              const currentClosedValue = existingProject.closed_value ?? existingProject.estimated_value ?? 0;
              const newClosedValue = Number(currentClosedValue) + aditivoValue;
              
              const { error: updateError } = await supabase
                .from('projects')
                .update({
                  closed_value: newClosedValue,
                  estimated_value: newClosedValue,
                })
                .eq('id', existingProject.id);
              
              if (updateError) {
                console.error('Error updating project value for aditivo:', updateError);
                toast.error('Erro ao atualizar valor do projeto');
              } else {
                // Save to value history
                await supabase
                  .from('project_value_history')
                  .insert({
                    project_id: existingProject.id,
                    presented_value: newClosedValue,
                    consultant_id: form.consultantId,
                    notes: `Aditivo: +${aditivoValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                  });
                
                toast.success(`Aditivo de ${aditivoValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} adicionado ao FOCCO ${foccoNumber}!`);
              }
            } else {
              toast.error(`Projeto FOCCO ${foccoNumber} não encontrado. Use "Venda" para criar um novo contrato.`);
              setIsSubmitting(false);
              return;
            }
          } else {
            toast.error('Informe o número FOCCO do projeto para o aditivo');
            setIsSubmitting(false);
            return;
          }
        } catch (err) {
          console.error('Error in aditivo flow:', err);
        }
      }
      // Handle regular Venda - update existing project or create new contract automatically
      else if (isVenda) {
        const foccoNumber = form.foccoProjectNumber.trim();
        
        try {
          if (foccoNumber) {
            // If FOCCO number provided, try to find and update existing project
            const existingProject = await findProjectByFocco(foccoNumber);
            
            if (existingProject) {
              const { error: updateError } = await supabase
                .from('projects')
                .update({
                  stage: 'closed_won',
                  closed_date: form.date,
                  closed_value: safeNumber(form.value, { min: 0 }) ?? existingProject.estimated_value,
                })
                .eq('id', existingProject.id);
              
              if (updateError) {
                console.error('Error updating project to closed_won:', updateError);
                toast.error('Erro ao atualizar status do projeto');
              } else {
                projectId = existingProject.id;
                
                // Update the client with complete data including contract number
                if (existingProject.client_id) {
                  clientId = existingProject.client_id;
                  await updateClientData(existingProject.client_id, {
                    contract_number: form.contractNumber.trim() || undefined,
                    name: form.clientName.trim() || undefined,
                    cpf_cnpj: form.clientCpfCnpj.trim() || undefined,
                    phone: form.clientPhone.trim() || undefined,
                    email: form.clientEmail.trim() || undefined,
                    address: form.clientAddress.trim() || undefined,
                    city: form.clientCity.trim() || undefined,
                    state: form.clientState.trim() || undefined,
                    age: safeParseInt(form.clientAge, { min: 0, max: 150 }) ?? undefined,
                    profession: form.clientProfession.trim() || undefined,
                  });
                  
                  // Also update status to closed
                  await supabase
                    .from('clients')
                    .update({ status: 'closed' })
                    .eq('id', existingProject.client_id);
                }
                
                // Create checklist for the closed project with assigned professionals
                await createChecklistForProject(existingProject.id, {
                  assignedProjetistaId: form.assignedProjetistaId || undefined,
                  assignedLogisticaId: form.assignedLogisticaId || undefined,
                  commercialResponsibleId: form.consultantId,
                });
                
                toast.success(`Projeto FOCCO ${foccoNumber} fechado com sucesso!`);
              }
            } else {
              // FOCCO provided but project doesn't exist - create new project as closed_won
              if (form.clientName.trim()) {
                clientId = await createClientDirect({
                  name: form.clientName.trim(),
                  age: safeParseInt(form.clientAge, { min: 0, max: 150 }),
                  profession: form.clientProfession || null,
                  professional_id: professionalId || null,
                  responsible_id: form.consultantId,
                  created_by: form.consultantId,
                  status: 'closed',
                });
                
                if (clientId) {
                  await updateClientData(clientId, {
                    contract_number: form.contractNumber.trim() || undefined,
                    cpf_cnpj: form.clientCpfCnpj.trim() || undefined,
                    phone: form.clientPhone.trim() || undefined,
                    email: form.clientEmail.trim() || undefined,
                    address: form.clientAddress.trim() || undefined,
                    city: form.clientCity.trim() || undefined,
                    state: form.clientState.trim() || undefined,
                  });
                }
              }
              
              const { data: newProject, error: projectError } = await supabase
                .from('projects')
                .insert({
                  name: `Projeto FOCCO ${foccoNumber}`,
                  focco_project_number: foccoNumber,
                  professional_id: professionalId || null,
                  responsible_id: form.consultantId,
                  created_by: form.consultantId,
                  client_id: clientId,
                  stage: 'closed_won',
                  start_date: form.date,
                  closed_date: form.date,
                  closed_value: safeNumber(form.value, { min: 0 }),
                  estimated_value: safeNumber(form.value, { min: 0 }),
                  origin_type: 'venda_direta', // Exception: Sale without prior presentation
                })
                .select('id')
                .single();
              
              if (projectError) {
                console.error('Error creating project:', projectError);
                toast.error('Erro ao criar contrato automaticamente');
              } else if (newProject) {
                projectId = newProject.id;
                
                // Create checklist for the new project with assigned professionals
                await createChecklistForProject(newProject.id, {
                  assignedProjetistaId: form.assignedProjetistaId || undefined,
                  assignedLogisticaId: form.assignedLogisticaId || undefined,
                  commercialResponsibleId: form.consultantId,
                });
                
                toast.success(`Contrato criado com FOCCO ${foccoNumber} (Venda Direta)!`);
              }
            }
          } else {
            // No FOCCO number - create new contract directly
            if (form.clientName.trim()) {
              clientId = await createClientDirect({
                name: form.clientName.trim(),
                age: safeParseInt(form.clientAge, { min: 0, max: 150 }),
                profession: form.clientProfession || null,
                professional_id: professionalId || null,
                responsible_id: form.consultantId,
                created_by: form.consultantId,
                status: 'closed',
              });
              
              if (clientId) {
                await updateClientData(clientId, {
                  contract_number: form.contractNumber.trim() || undefined,
                  cpf_cnpj: form.clientCpfCnpj.trim() || undefined,
                  phone: form.clientPhone.trim() || undefined,
                  email: form.clientEmail.trim() || undefined,
                  address: form.clientAddress.trim() || undefined,
                  city: form.clientCity.trim() || undefined,
                  state: form.clientState.trim() || undefined,
                });
              }
            }
            
            // Generate a unique project name without FOCCO
            const projectName = form.clientName.trim() 
              ? `Venda - ${form.clientName.trim()}`
              : `Venda - ${format(new Date(form.date), 'dd/MM/yyyy')}`;
            
            const { data: newProject, error: projectError } = await supabase
              .from('projects')
              .insert({
                name: projectName,
                focco_project_number: null,
                professional_id: professionalId || null,
                responsible_id: form.consultantId,
                created_by: form.consultantId,
                client_id: clientId,
                stage: 'closed_won',
                start_date: form.date,
                closed_date: form.date,
                closed_value: safeNumber(form.value, { min: 0 }),
                estimated_value: safeNumber(form.value, { min: 0 }),
                origin_type: 'venda_direta', // Exception: Direct sale without FOCCO
              })
              .select('id')
              .single();
            
            if (projectError) {
              console.error('Error creating project:', projectError);
              toast.error('Erro ao criar contrato automaticamente');
            } else if (newProject) {
              projectId = newProject.id;
              
              // Create checklist for the new project with assigned professionals
              await createChecklistForProject(newProject.id, {
                assignedProjetistaId: form.assignedProjetistaId || undefined,
                assignedLogisticaId: form.assignedLogisticaId || undefined,
                commercialResponsibleId: form.consultantId,
              });
              
              toast.success('Contrato criado com sucesso (Venda Direta)!');
            }
          }
        } catch (err) {
          console.error('Error in sale project flow:', err);
        }
      }

      // For any other action with FOCCO number - update client data progressively
      if (!isApresentacaoProjeto && !isVenda && form.foccoProjectNumber.trim()) {
        const existingProject = await findProjectByFocco(form.foccoProjectNumber.trim());
        if (existingProject?.client_id) {
          await updateClientData(existingProject.client_id, {
            name: form.clientName.trim() || undefined,
            cpf_cnpj: form.clientCpfCnpj.trim() || undefined,
            phone: form.clientPhone.trim() || undefined,
            email: form.clientEmail.trim() || undefined,
            address: form.clientAddress.trim() || undefined,
            city: form.clientCity.trim() || undefined,
            state: form.clientState.trim() || undefined,
             age: safeParseInt(form.clientAge, { min: 0, max: 150 }) ?? undefined,
             profession: form.clientProfession.trim() || undefined,
             contract_number: form.contractNumber.trim() || undefined,
           });
           projectId = existingProject.id;
         }
       }

       // Add action
       const actionId = await addAction({
         consultantId: form.consultantId,
         professionalId,
         actionTypeId: form.actionTypeId,
         date: form.date,
         value: safeNumber(form.value, { min: 0 }) ?? undefined,
         clientName: form.clientName || undefined,
         clientAge: safeParseInt(form.clientAge, { min: 0, max: 150 }) ?? undefined,
        clientProfession: form.clientProfession || undefined,
        presentationNumber: form.presentationNumber || undefined,
        foccoProjectNumber: form.foccoProjectNumber || undefined,
        pointsGenerated: points,
        projectId,
      });

      if (!actionId) {
        toast.error('Erro ao registrar ação');
        setIsSubmitting(false);
        return;
      }

      // Add credits
      if (points > 0) {
        const professional = professionalId ? professionals.find(p => p.id === professionalId) : null;
        const professionalName = professional?.name || newProfessional.name || 'Sem Especificador';
        addCreditTransaction({
          consultantId: form.consultantId,
          amount: points,
          type: 'ganho',
          description: `${selectedActionType?.name} - ${professionalName}`,
          date: form.date,
          actionId: actionId,
          actionTypeId: form.actionTypeId,
          status: 'active',
        });
      }

      // AUTOMATION: Create project environment record for Projetista de Apresentação or Projetista Técnico
      const shouldCreateEnvironment = 
        (isApresentacaoProjeto && isEffectiveProjetista && form.environmentCount && form.consultantId) ||
        (isProjeto && isEffectiveProjetistaTecnico && form.environmentCount && form.consultantId);
      
      if (shouldCreateEnvironment) {
        const envType = (isProjeto && isEffectiveProjetistaTecnico) ? 'tecnico' : 'apresentacao';
        try {
          await createEnvironment.mutateAsync({
            environment_type: envType,
            environment_count: safeParseInt(form.environmentCount, { min: 1 }) ?? 1,
            projetista_id: form.consultantId,
            consultant_id: form.commercialConsultantId || undefined, // Commercial consultant served
            project_id: projectId,
            action_id: actionId,
            competence_date: form.date,
          });
          
          // Also update the action with environment_count
          await supabase
            .from('actions')
            .update({ environment_count: safeParseInt(form.environmentCount, { min: 1 }) ?? 1 })
            .eq('id', actionId);
            
        } catch (envError) {
          console.error('Error creating environment record:', envError);
          // Don't fail the whole action, just log the error
        }
      }

      // AUTOMATION: Create CS case ONLY when Assinatura de Certificado de Garantia (seletiva) is registered
      if (isSeletiva && form.contractNumber.trim()) {
        try {
          // Check if CS case already exists for this contract (prevent duplicates)
          const { data: existingCase } = await supabase
            .from('cs_cases')
            .select('id')
            .eq('contract_number', form.contractNumber.trim())
            .maybeSingle();

          if (!existingCase) {
            // Get the client and project IDs - either from loaded data or we need to create them
            let csClientId: string | null = loadedClientData?.clientId || null;
            let csProjectId: string | null = loadedClientData?.projectId || projectId || null;
            
            // EXCEPTION FLOW: If no project exists, create Client, Project and Contract automatically
            // This handles "Certificado sem Venda" scenario
            if (!csProjectId && form.contractNumber.trim()) {
              // First, try to find project by contract number in clients
              const { data: existingClientWithContract } = await supabase
                .from('clients')
                .select('id, name')
                .eq('contract_number', form.contractNumber.trim())
                .maybeSingle();
              
              if (existingClientWithContract) {
                csClientId = existingClientWithContract.id;
                
                // Find project linked to this client
                const { data: linkedProject } = await supabase
                  .from('projects')
                  .select('id')
                  .eq('client_id', existingClientWithContract.id)
                  .eq('stage', 'closed_won')
                  .maybeSingle();
                
                if (linkedProject) {
                  csProjectId = linkedProject.id;
                }
              }
              
              // If still no project, create everything (Certificado sem Venda)
              if (!csProjectId) {
                // Create client if we have a name
                if (form.clientName.trim() && !csClientId) {
                  csClientId = await createClientDirect({
                    name: form.clientName.trim(),
                    age: form.clientAge ? Number(form.clientAge) : null,
                    profession: form.clientProfession || null,
                    professional_id: professionalId || null,
                    responsible_id: form.consultantId,
                    created_by: form.consultantId,
                    status: 'closed',
                  });
                  
                  if (csClientId) {
                    await updateClientData(csClientId, {
                      contract_number: form.contractNumber.trim(),
                      cpf_cnpj: form.clientCpfCnpj.trim() || undefined,
                      phone: form.clientPhone.trim() || undefined,
                      email: form.clientEmail.trim() || undefined,
                      address: form.clientAddress.trim() || undefined,
                      city: form.clientCity.trim() || undefined,
                      state: form.clientState.trim() || undefined,
                    });
                  }
                }
                
                // Create project (as closed_won since we have a certificate)
                const projectName = form.clientName.trim() 
                  ? `Certificado - ${form.clientName.trim()}`
                  : `Certificado - ${form.contractNumber.trim()}`;
                
                const { data: newProject, error: projectError } = await supabase
                  .from('projects')
                  .insert({
                    name: projectName,
                    focco_project_number: form.foccoProjectNumber.trim() || null,
                    professional_id: professionalId || null,
                    responsible_id: form.consultantId,
                    created_by: form.consultantId,
                    client_id: csClientId,
                    stage: 'closed_won',
                    start_date: form.date,
                    closed_date: form.date,
                    origin_type: 'certificado_sem_venda', // Exception: Certificate without prior sale
                  })
                  .select('id')
                  .single();
                
                if (projectError) {
                  console.error('Error creating project for certificate:', projectError);
                } else if (newProject) {
                  csProjectId = newProject.id;
                  projectId = newProject.id; // Update for action linking
                  toast.info('Cliente/Projeto criado automaticamente (Certificado sem Venda registrada)');
                }
              }
            }
            
            // Create new CS case
            const { data: newCSCase, error: csCaseError } = await supabase
              .from('cs_cases')
              .insert({
                client_id: csClientId,
                project_id: csProjectId,
                contract_number: form.contractNumber.trim(),
                signature_date: form.date,
                responsible_id: form.consultantId,
                status: 'active',
                notes: 'Caso criado automaticamente via Assinatura de Certificado de Garantia',
              })
              .select('id')
              .single();

            if (csCaseError) {
              console.error('Error creating CS case:', csCaseError);
              toast.error('Erro ao criar caso de Customer Success');
            } else if (newCSCase && csSchedules && csSchedules.length > 0) {
              // Generate scheduled CS actions based on configured schedules
              await generateCSActionsForCase(newCSCase.id, form.date, csSchedules);
              toast.success('Caso de Customer Success iniciado com visitas programadas!');
            } else if (newCSCase) {
              toast.success('Caso de Customer Success criado (configure periodicidades no Setup para gerar visitas)');
            }
          } else {
            toast.info('Caso de Customer Success já existe para este contrato');
          }
        } catch (csError) {
          console.error('Error in CS case creation:', csError);
        }
      }

      toast.success('Ação registrada com sucesso!');

      // Reset form
      setForm(initialFormState);
      setIsNewProfessional(false);
      setNewProfessional({ name: '', typeId: '' });
      setSpecialDate({ date: '', reason: '', type: 'anual' });
      setLoadedClientData(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting action:', error);
      toast.error('Erro ao registrar ação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground border-black max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>REGISTRAR AÇÃO</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Collaborator Selection - Only show dropdown for admins */}
          <div>
            <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.consultantId ? 'text-destructive' : 'text-muted-foreground'}`}>
              Colaborador *
            </label>
            {isAdmin ? (
              <select
                value={form.consultantId}
                onChange={(e) => {
                  handleFieldChange('consultantId', e.target.value);
                  handleFieldChange('professionalId', '');
                  handleFieldChange('actionTypeId', '');
                }}
                className={`input-flat w-full text-card-foreground ${errors.consultantId ? 'border-destructive ring-1 ring-destructive' : ''}`}
              >
                <option value="">Selecione</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            ) : (
              <div className="input-flat w-full text-card-foreground bg-muted/30 cursor-not-allowed">
                {currentTeamMember?.name || 'Carregando...'}
              </div>
            )}
            {errors.consultantId && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
          </div>

          {/* For users from Projetos area: show Commercial Consultant selector */}
          {(isEffectiveProjetista || isEffectiveProjetistaTecnico) && form.consultantId && (
            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.commercialConsultantId ? 'text-destructive' : 'text-muted-foreground'}`}>
                Consultor Comercial Atendido *
              </label>
              <select
                value={form.commercialConsultantId}
                onChange={(e) => handleFieldChange('commercialConsultantId', e.target.value)}
                className={`input-flat w-full text-card-foreground ${errors.commercialConsultantId ? 'border-destructive ring-1 ring-destructive' : ''}`}
              >
                <option value="">Selecione</option>
                {commercialConsultants.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.commercialConsultantId && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
              <p className="text-xs text-muted-foreground mt-1">
                Selecione o consultor comercial que receberá esta apresentação
              </p>
            </div>
          )}

          {/* Professional/Specifier Selection - Hide for users from Projetos area */}
          {form.consultantId && !isEffectiveProjetista && !isEffectiveProjetistaTecnico && (
            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.professionalId ? 'text-destructive' : 'text-muted-foreground'}`}>
                Especificador {isStrictValidationType ? '*' : ''}
              </label>
              <div className="flex items-center gap-4 mb-2 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!isNewProfessional && form.professionalId !== 'none'}
                    onChange={() => {
                      setIsNewProfessional(false);
                      handleFieldChange('professionalId', '');
                    }}
                  />
                  Existente
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={isNewProfessional}
                    onChange={() => {
                      setIsNewProfessional(true);
                      handleFieldChange('professionalId', '');
                    }}
                  />
                  Novo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!isNewProfessional && form.professionalId === 'none'}
                    onChange={() => {
                      setIsNewProfessional(false);
                      handleFieldChange('professionalId', 'none');
                    }}
                  />
                  Sem Especificador
                </label>
              </div>
              {errors.professionalId && <span className="text-xs text-destructive mt-1 block mb-2">Campo obrigatório</span>}
              {!isNewProfessional && form.professionalId !== 'none' ? (
                <select
                  value={form.professionalId}
                  onChange={(e) => handleFieldChange('professionalId', e.target.value)}
                  className={`input-flat w-full text-card-foreground ${errors.professionalId ? 'border-destructive ring-1 ring-destructive' : ''}`}
                >
                  <option value="">Selecione</option>
                  {consultantProfessionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : isNewProfessional ? (
                <div className="space-y-3">
                  <div>
                    <input
                      value={newProfessional.name}
                      onChange={(e) => {
                        setNewProfessional({ ...newProfessional, name: e.target.value });
                        setErrors({ ...errors, professionalName: false });
                      }}
                      placeholder="Nome do profissional *"
                      className={`input-flat w-full text-card-foreground ${errors.professionalName ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    />
                    {errors.professionalName && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
                  </div>
                  <div>
                    <select
                      value={newProfessional.typeId}
                      onChange={(e) => {
                        setNewProfessional({ ...newProfessional, typeId: e.target.value });
                        setErrors({ ...errors, professionalType: false });
                      }}
                      className={`input-flat w-full text-card-foreground ${errors.professionalType ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    >
                      <option value="">Tipo de profissional *</option>
                      {professionalTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {errors.professionalType && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
                  </div>
                  
                  {/* Special Date Section for New Professional */}
                  <div className="border border-border rounded-md p-3 space-y-2 bg-muted/30">
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block">Data Especial (opcional)</label>
                    <input
                      type="date"
                      value={specialDate.date}
                      onChange={(e) => setSpecialDate({ ...specialDate, date: e.target.value })}
                      className="input-flat w-full text-card-foreground"
                    />
                    <input
                      value={specialDate.reason}
                      onChange={(e) => setSpecialDate({ ...specialDate, reason: e.target.value })}
                      placeholder="Motivo (ex: Aniversário)"
                      className="input-flat w-full text-card-foreground"
                    />
                    <select
                      value={specialDate.type}
                      onChange={(e) => setSpecialDate({ ...specialDate, type: e.target.value as 'unica' | 'mensal' | 'anual' })}
                      className="input-flat w-full text-card-foreground"
                    >
                      <option value="anual">Anual (recorrente)</option>
                      <option value="mensal">Mensal (recorrente)</option>
                      <option value="unica">Única vez</option>
                    </select>
                    {specialDate.date && specialDate.reason && (
                      <p className="text-xs text-green-600">✓ Lembrete será criado automaticamente</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Ação será registrada sem especificador vinculado.</p>
              )}
            </div>
          )}

          {/* Action Type */}
          <div>
            <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.actionTypeId ? 'text-destructive' : 'text-muted-foreground'}`}>
              Tipo de Ação *
            </label>
            <select
              value={form.actionTypeId}
              onChange={(e) => handleFieldChange('actionTypeId', e.target.value)}
              className={`input-flat w-full text-card-foreground ${errors.actionTypeId ? 'border-destructive ring-1 ring-destructive' : ''}`}
            >
              <option value="">Selecione</option>
              {filteredActionTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.actionTypeId && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
          </div>

          {/* Date */}
          <div>
            <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.date ? 'text-destructive' : 'text-muted-foreground'}`}>
              Data *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className={`input-flat w-full text-card-foreground ${errors.date ? 'border-destructive ring-1 ring-destructive' : ''}`}
            />
            {errors.date && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
          </div>

          {/* Environment Count - For Projetista de Apresentação (Apresentação) or Projetista Técnico (Projeto Técnico) */}
          {((isApresentacaoProjeto && isEffectiveProjetista) || (isProjeto && isEffectiveProjetistaTecnico)) && (
            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.environmentCount ? 'text-destructive' : 'text-muted-foreground'}`}>
                {isApresentacaoProjeto && isEffectiveProjetista ? 'Quantidade *' : 'Quantidade de Ambientes *'}
              </label>
              <input
                type="number"
                min="1"
                value={form.environmentCount}
                onChange={(e) => handleFieldChange('environmentCount', e.target.value)}
                placeholder="Ex: 3"
                className={`input-flat w-full text-card-foreground ${errors.environmentCount ? 'border-destructive ring-1 ring-destructive' : ''}`}
              />
              {errors.environmentCount && <span className="text-xs text-destructive mt-1">Campo obrigatório (mínimo 1)</span>}
              {isProjeto && isEffectiveProjetistaTecnico && (
                <p className="text-xs text-muted-foreground mt-1">
                  Informe o número de ambientes projetados
                </p>
              )}
            </div>
          )}

          {/* Value (for sales or Projetista Técnico) */}
          {((selectedActionType?.requiresValue && selectedActionType.requiresValue !== 'nenhum') || (isProjeto && isEffectiveProjetistaTecnico)) && (
            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.value ? 'text-destructive' : 'text-muted-foreground'}`}>
                {(isProjeto && isEffectiveProjetistaTecnico) ? 'Valor (R$)' : selectedActionType?.requiresValue === 'ambientes' ? 'Quantidade de Ambientes *' : 'Valor da Venda (R$) *'}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => handleFieldChange('value', e.target.value)}
                placeholder={selectedActionType?.requiresValue === 'quantitativo' ? '0' : 'R$ 0,00'}
                className={`input-flat w-full text-card-foreground ${errors.value ? 'border-destructive ring-1 ring-destructive' : ''}`}
              />
              {errors.value && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
            </div>
          )}

          {/* Assigned Professionals for Checklist - Only for Venda */}
          {isVenda && !isVendaAditivo && (
            <div className={`border rounded-md p-3 space-y-3 bg-muted/30 ${errors.assignedProjetistaId || errors.assignedLogisticaId ? 'border-red-500' : 'border-border'}`}>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block">
                Atribuir Responsáveis do Checklist <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione os profissionais responsáveis pelas etapas técnicas e de logística deste contrato.
              </p>
              
              {/* Projetista Técnico */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Projetista Técnico <span className="text-red-500">*</span>
                </label>
                {projetistaMembers.length > 0 ? (
                  <select
                    value={form.assignedProjetistaId}
                    onChange={(e) => handleFieldChange('assignedProjetistaId', e.target.value)}
                    className={`input-flat w-full text-card-foreground ${errors.assignedProjetistaId ? 'border-red-500' : ''}`}
                  >
                    <option value="">Selecione um projetista</option>
                    {projetistaMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-orange-500 italic">
                    Nenhum membro com cargo "Projetista Técnico" encontrado
                  </p>
                )}
              </div>

              {/* Analista de Logística */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Analista de Logística <span className="text-red-500">*</span>
                </label>
                {logisticaMembers.length > 0 ? (
                  <select
                    value={form.assignedLogisticaId}
                    onChange={(e) => handleFieldChange('assignedLogisticaId', e.target.value)}
                    className={`input-flat w-full text-card-foreground ${errors.assignedLogisticaId ? 'border-red-500' : ''}`}
                  >
                    <option value="">Selecione um analista</option>
                    {logisticaMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-orange-500 italic">
                    Nenhum membro com cargo "Analista de Logística" encontrado
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Smart Client Fields - Only show if action type has enabled fields */}
          <SmartClientFields
            formData={{
              clientName: form.clientName,
              clientCpfCnpj: form.clientCpfCnpj,
              clientPhone: form.clientPhone,
              clientEmail: form.clientEmail,
              clientAddress: form.clientAddress,
              clientCity: form.clientCity,
              clientState: form.clientState,
              clientAge: form.clientAge,
              clientProfession: form.clientProfession,
              presentationNumber: form.presentationNumber,
              foccoProjectNumber: form.foccoProjectNumber,
              contractNumber: form.contractNumber,
              presentedValue: form.presentedValue,
            }}
            onFieldChange={handleFieldChange}
            onBulkUpdate={handleBulkUpdate}
            onClientDataLoaded={handleClientDataLoaded}
            errors={errors}
            isVenda={isVenda}
            isApresentacao={isApresentacaoProjeto}
            isSeletiva={isSeletiva}
            enabledFields={selectedActionType?.enabledFields || []}
            restrictToFoccoOnly={isEffectiveProjetista || isEffectiveProjetistaTecnico}
          />

          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="btn-primary w-full bg-card-foreground text-card mt-4 disabled:opacity-50"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
