import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Action } from '@/types';
import { safeNumber, safeParseInt } from '@/lib/validators';
import { findProjectByFocco } from '@/hooks/useProjects';
import { createClientDirect } from '@/hooks/useClients';

import { createChecklistForProject } from '@/hooks/useChecklist';

interface EditActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: Action | null;
}

const normalizeText = (value: string | null | undefined) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function EditActionModal({ open, onOpenChange, action }: EditActionModalProps) {
  const { isAdmin } = useAuthContext();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const queryClient = useQueryClient();
  const { 
    teamMembers, 
    professionals, 
    actionTypes, 
    updateAction,
    creditTransactions,
    updateCreditTransaction,
    addCreditTransaction,
    deleteCreditTransaction,
  } = useApp();

  const activeMembers = teamMembers.filter(m => m.active);

  const [form, setForm] = useState({
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
    presentedValue: '',
    assignedProjetistaId: '',
    assignedLogisticaId: '',
    aditivoLinkExisting: true,
    aditivoOriginalContract: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Fetch projetista/logistica members for checklist assignment
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
        const logisticaPos = positions.find(p => p.name.toLowerCase().includes('logistica') || p.name.toLowerCase().includes('logística'));

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

  // Populate form when action changes
  useEffect(() => {
    if (action) {
      setForm({
        consultantId: action.consultantId || '',
        professionalId: action.professionalId || '',
        actionTypeId: action.actionTypeId || '',
        date: action.date || format(new Date(), 'yyyy-MM-dd'),
        value: action.value?.toString() || '',
        clientName: action.clientName || '',
        clientAge: action.clientAge?.toString() || '',
        clientProfession: action.clientProfession || '',
        presentationNumber: action.presentationNumber || '',
        foccoProjectNumber: action.foccoProjectNumber || '',
        presentedValue: '',
        assignedProjetistaId: '',
        assignedLogisticaId: '',
        aditivoLinkExisting: true,
        aditivoOriginalContract: '',
      });
      // Load presented value from project if exists
      const loadPresentedValue = async () => {
        let projectData = null;
        if (action.projectId) {
          const { data } = await supabase
            .from('projects')
            .select('estimated_value')
            .eq('id', action.projectId)
            .single();
          projectData = data;
        } else if (action.foccoProjectNumber) {
          const { data } = await supabase
            .from('projects')
            .select('estimated_value')
            .eq('focco_project_number', action.foccoProjectNumber)
            .single();
          projectData = data;
        }
        if (projectData?.estimated_value) {
          setForm(prev => ({ ...prev, presentedValue: projectData.estimated_value.toString() }));
        }
      };
      loadPresentedValue();
    }
  }, [action]);

  const selectedActionType = actionTypes.find(t => t.id === form.actionTypeId);
  const consultantProfessionals = professionals.filter(p => p.consultantId === form.consultantId);
  const oldActionType = action ? actionTypes.find(t => t.id === action.actionTypeId) : null;
  const isVenda = selectedActionType?.classification === 'venda';
  const isVendaAditivo = isVenda && (selectedActionType?.name?.toLowerCase().includes('aditivo') ?? false);
  const normalizedSelectedActionName = normalizeText(selectedActionType?.name);
  const normalizedOldActionName = normalizeText(oldActionType?.name);
  const isApresentacaoProjeto = normalizedSelectedActionName.startsWith('apresentacao de projeto') &&
    !normalizedSelectedActionName.includes('reforma');
  
  

  // Check if user can edit this action
  const canEdit = isAdmin || (currentTeamMember?.id && action?.consultantId === currentTeamMember.id);

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (!form.consultantId) newErrors.consultantId = true;
    if (!form.actionTypeId) newErrors.actionTypeId = true;
    if (!form.date) newErrors.date = true;
    
    if (selectedActionType?.requiresValue && selectedActionType.requiresValue !== 'nenhum' && !form.value) {
      newErrors.value = true;
    }

    if (selectedActionType?.enabledFields?.includes('presentedValue') && !form.presentedValue) {
      newErrors.presentedValue = true;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!action) return;
    if (!canEdit) {
      toast.error('Você não tem permissão para editar esta ação');
      return;
    }
    
    if (!validateForm()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const newActionType = actionTypes.find(t => t.id === form.actionTypeId);
      const oldPoints = oldActionType?.programPoints || 0;
      const newPoints = newActionType?.programPoints || 0;
      const newValue = safeNumber(form.value, { min: 0 });
      const newPresentedValue = safeNumber(form.presentedValue, { min: 0 });
      const oldWasVenda = oldActionType?.classification === 'venda';
      const oldWasApresentacaoProjeto = normalizedOldActionName.startsWith('apresentacao de projeto') &&
        !normalizedOldActionName.includes('reforma');
      const valueChanged = (newValue ?? null) !== (action.value ?? null);

      // Update the action
      await updateAction(action.id, {
        consultantId: form.consultantId,
        professionalId: form.professionalId || undefined,
        actionTypeId: form.actionTypeId,
        date: form.date,
        value: newValue ?? undefined,
        clientName: form.clientName || undefined,
        clientAge: safeParseInt(form.clientAge, { min: 0, max: 150 }) ?? undefined,
        clientProfession: form.clientProfession || undefined,
        presentationNumber: form.presentationNumber || undefined,
      });

      // Update focco_project_number directly
      if (form.foccoProjectNumber !== action.foccoProjectNumber) {
        await supabase
          .from('actions')
          .update({ focco_project_number: form.foccoProjectNumber || null })
          .eq('id', action.id);
      }

      // Handle credit transaction updates
      const existingCredit = creditTransactions.find(ct => ct.actionId === action.id && ct.type === 'ganho');
      const consultantChanged = form.consultantId !== action.consultantId;
      const pointsChanged = newPoints !== oldPoints;
      
      if (existingCredit) {
        if (newPoints === 0) {
          await deleteCreditTransaction(existingCredit.id);
        } else if (pointsChanged || consultantChanged) {
          const professional = form.professionalId ? professionals.find(p => p.id === form.professionalId) : null;
          const professionalName = professional?.name || 'Sem Especificador';
          
          await updateCreditTransaction(existingCredit.id, {
            consultantId: form.consultantId,
            amount: newPoints,
            description: `${newActionType?.name} - ${professionalName}`,
            date: form.date,
          });
        }
      } else if (newPoints > 0) {
        const professional = form.professionalId ? professionals.find(p => p.id === form.professionalId) : null;
        const professionalName = professional?.name || 'Sem Especificador';
        
        addCreditTransaction({
          consultantId: form.consultantId,
          amount: newPoints,
          type: 'ganho',
          description: `${newActionType?.name} - ${professionalName}`,
          date: form.date,
          actionId: action.id,
          actionTypeId: form.actionTypeId,
          status: 'active',
        });
      }

      // ===== VENDA FLOW: Create project + checklist when changing to Venda =====
      // If switching aditivo to "link existing", remove the checklist+project that this action created.
      if (isVendaAditivo && form.aditivoLinkExisting && action.projectId) {
        // Validate original contract number when linking
        if (!form.aditivoOriginalContract.trim()) {
          setErrors({ aditivoOriginalContract: true });
          toast.error('Informe o número do contrato original.');
          setIsSubmitting(false);
          return;
        }
        try {
          // Only auto-cleanup if this project was clearly created by this action (origin venda_direta and only this action linked)
          const { data: linkedActions } = await supabase
            .from('actions').select('id').eq('project_id', action.projectId);
          if (linkedActions && linkedActions.length <= 1) {
            // Delete checklist and unlink action
            const { data: cl } = await supabase
              .from('contract_checklists').select('id').eq('project_id', action.projectId);
            if (cl) {
              for (const c of cl) {
                await supabase.from('checklist_items').delete().eq('checklist_id', c.id);
                await supabase.from('contract_checklists').delete().eq('id', c.id);
              }
            }
            await supabase.from('actions').update({ project_id: null }).eq('id', action.id);
            await supabase.from('projects').delete().eq('id', action.projectId);
            toast.info('Checklist do aditivo removido — valor será somado ao contrato principal.');
          }

          // Now sum the value to the principal project (locate by original contract first)
          const foccoNumber = form.foccoProjectNumber.trim();
          const originalContract = form.aditivoOriginalContract.trim();
          let principal: any = null;
          if (originalContract) {
            const { data: clientWithContract } = await supabase
              .from('clients').select('id').eq('contract_number', originalContract).maybeSingle();
            if (clientWithContract) {
              const { data: proj } = await supabase
                .from('projects')
                .select('id, closed_value, estimated_value')
                .eq('client_id', clientWithContract.id)
                .order('closed_date', { ascending: false })
                .limit(1)
                .maybeSingle();
              principal = proj;
            }
          }
          if (!principal && foccoNumber) {
            principal = await findProjectByFocco(foccoNumber);
          }
          {
            if (principal) {
              const aditivoValue = newValue ?? 0;
              const current = principal.closed_value ?? principal.estimated_value ?? 0;
              await supabase.from('projects').update({
                closed_value: Number(current) + aditivoValue,
                estimated_value: Number(current) + aditivoValue,
              }).eq('id', principal.id);
              await supabase.from('actions').update({ project_id: principal.id }).eq('id', action.id);
            } else {
              toast.error(`Nenhum contrato encontrado com nº "${originalContract}".`);
            }
          }
        } catch (err) {
          console.error('Error converting aditivo to linked:', err);
        }
      } else if (isVenda && !isVendaAditivo && !action.projectId) {
        // Check if there's already a project for this action (via projectId or checklist)
        const existingChecklist = action.projectId ? await supabase
          .from('contract_checklists')
          .select('id')
          .eq('project_id', action.projectId)
          .maybeSingle() : null;

        if (!existingChecklist?.data) {
          const foccoNumber = form.foccoProjectNumber?.trim();
          let projectId: string | undefined;
          let clientId: string | null = null;

          try {
            if (foccoNumber) {
              const existingProject = await findProjectByFocco(foccoNumber);
              
              if (existingProject) {
                // Update existing project to closed_won
                const { error: updateError } = await supabase
                  .from('projects')
                  .update({
                    stage: 'closed_won',
                    closed_date: form.date,
                    closed_value: safeNumber(form.value, { min: 0 }) ?? existingProject.estimated_value,
                  })
                  .eq('id', existingProject.id);
                
                if (!updateError) {
                  projectId = existingProject.id;
                  
                  if (existingProject.client_id) {
                    clientId = existingProject.client_id;
                    await supabase
                      .from('clients')
                      .update({ status: 'closed' })
                      .eq('id', existingProject.client_id);
                  }

                  // Create checklist
                  await createChecklistForProject(existingProject.id, {
                    assignedProjetistaId: form.assignedProjetistaId || undefined,
                    assignedLogisticaId: form.assignedLogisticaId || undefined,
                    commercialResponsibleId: form.consultantId,
                  });
                  
                  toast.success(`Projeto FOCCO ${foccoNumber} fechado e checklist criado!`);
                }
              } else {
                // FOCCO provided but no project exists - create new
                if (form.clientName?.trim()) {
                  clientId = await createClientDirect({
                    name: form.clientName.trim(),
                    age: safeParseInt(form.clientAge, { min: 0, max: 150 }),
                    profession: form.clientProfession || null,
                    professional_id: form.professionalId || null,
                    responsible_id: form.consultantId,
                    status: 'closed',
                  });
                }

                const { data: newProject, error: projectError } = await supabase
                  .from('projects')
                  .insert({
                    name: `Projeto FOCCO ${foccoNumber}`,
                    focco_project_number: foccoNumber,
                    professional_id: form.professionalId || null,
                    responsible_id: form.consultantId,
                    created_by: form.consultantId,
                    client_id: clientId,
                    stage: 'closed_won',
                    start_date: form.date,
                    closed_date: form.date,
                    closed_value: safeNumber(form.value, { min: 0 }),
                    estimated_value: safeNumber(form.value, { min: 0 }),
                    origin_type: 'venda_direta',
                  })
                  .select('id')
                  .single();

                if (!projectError && newProject) {
                  projectId = newProject.id;
                  await createChecklistForProject(newProject.id, {
                    assignedProjetistaId: form.assignedProjetistaId || undefined,
                    assignedLogisticaId: form.assignedLogisticaId || undefined,
                    commercialResponsibleId: form.consultantId,
                  });
                  toast.success(`Contrato criado com FOCCO ${foccoNumber} e checklist gerado!`);
                }
              }
            } else {
              // No FOCCO - create direct sale project
              if (form.clientName?.trim()) {
                clientId = await createClientDirect({
                  name: form.clientName.trim(),
                  age: safeParseInt(form.clientAge, { min: 0, max: 150 }),
                  profession: form.clientProfession || null,
                  professional_id: form.professionalId || null,
                  responsible_id: form.consultantId,
                  status: 'closed',
                });
              }

              const projectName = form.clientName?.trim()
                ? `Venda - ${form.clientName.trim()}`
                : `Venda - ${format(new Date(form.date), 'dd/MM/yyyy')}`;

              const { data: newProject, error: projectError } = await supabase
                .from('projects')
                .insert({
                  name: projectName,
                  focco_project_number: null,
                  professional_id: form.professionalId || null,
                  responsible_id: form.consultantId,
                  created_by: form.consultantId,
                  client_id: clientId,
                  stage: 'closed_won',
                  start_date: form.date,
                  closed_date: form.date,
                  closed_value: safeNumber(form.value, { min: 0 }),
                  estimated_value: safeNumber(form.value, { min: 0 }),
                  origin_type: 'venda_direta',
                })
                .select('id')
                .single();

              if (!projectError && newProject) {
                projectId = newProject.id;
                await createChecklistForProject(newProject.id, {
                  assignedProjetistaId: form.assignedProjetistaId || undefined,
                  assignedLogisticaId: form.assignedLogisticaId || undefined,
                  commercialResponsibleId: form.consultantId,
                });
                toast.success('Contrato e checklist criados com sucesso (Venda Direta)!');
              }
            }

            // Link action to the new project
            if (projectId) {
              await supabase
                .from('actions')
                .update({ project_id: projectId })
                .eq('id', action.id);
            }
          } catch (err) {
            console.error('Error in sale project flow:', err);
            toast.error('Erro ao criar projeto/checklist da venda');
          }
        }
      }

      // Update project if focco number changed and project exists
      if (action.projectId && form.foccoProjectNumber !== action.foccoProjectNumber) {
        await supabase
          .from('projects')
          .update({ focco_project_number: form.foccoProjectNumber || null })
          .eq('id', action.projectId);
      }

      // If value changed for a sale, update project closed_value
      const newClassification = newActionType?.classification as string | undefined;
      if (action.projectId && valueChanged) {
        if (newClassification === 'venda') {
          await supabase
            .from('projects')
            .update({
              closed_value: newValue,
              stage: 'closed_won',
              closed_date: form.date,
            })
            .eq('id', action.projectId);
        } else if (oldWasVenda && newClassification !== 'venda') {
          await supabase
            .from('projects')
            .update({ closed_value: null })
            .eq('id', action.projectId);
        }
      }

      // ===== APRESENTAÇÃO DE PROJETO FLOW: Create/Update project + client + value history =====
      if (isApresentacaoProjeto && form.foccoProjectNumber.trim()) {
        const foccoNumber = form.foccoProjectNumber.trim();
        const presentedValueNum = newPresentedValue;

        try {
          const existingProject = await findProjectByFocco(foccoNumber);

          if (existingProject) {
            // Update existing project with latest presented value
            const updateData: Record<string, unknown> = {};
            if (presentedValueNum !== null) {
              updateData.estimated_value = presentedValueNum;
            }

            if (Object.keys(updateData).length > 0) {
              await supabase
                .from('projects')
                .update(updateData)
                .eq('id', existingProject.id);
            }

            // Save to value history
            if (presentedValueNum !== null) {
              await supabase
                .from('project_value_history')
                .insert({
                  project_id: existingProject.id,
                  presented_value: presentedValueNum,
                  consultant_id: form.consultantId,
                  action_id: action.id,
                });
            }

            // Link action to existing project if not yet linked
            if (!action.projectId) {
              await supabase
                .from('actions')
                .update({ project_id: existingProject.id })
                .eq('id', action.id);
            }

            toast.info(`Ação vinculada ao projeto FOCCO ${foccoNumber}. Carteira flutuante atualizada.`);
          } else {
            // Create new client if name provided
            let clientId: string | null = null;
            if (form.clientName?.trim()) {
              clientId = await createClientDirect({
                name: form.clientName.trim(),
                age: safeParseInt(form.clientAge, { min: 0, max: 150 }),
                profession: form.clientProfession || null,
                professional_id: form.professionalId || null,
                responsible_id: form.consultantId,
                created_by: form.consultantId,
                status: 'apresentado',
              });
            }

            // Create new project (em_negociacao = entra na carteira flutuante)
            const { data: newProject, error: projectError } = await supabase
              .from('projects')
              .insert({
                name: `Projeto FOCCO ${foccoNumber}`,
                focco_project_number: foccoNumber,
                professional_id: form.professionalId || null,
                responsible_id: form.consultantId,
                created_by: form.consultantId,
                client_id: clientId,
                stage: 'em_negociacao',
                start_date: form.date,
                estimated_value: presentedValueNum,
                origin_type: 'standard',
              })
              .select('id')
              .single();

            if (!projectError && newProject) {
              // Save initial value history
              if (presentedValueNum !== null) {
                await supabase
                  .from('project_value_history')
                  .insert({
                    project_id: newProject.id,
                    presented_value: presentedValueNum,
                    consultant_id: form.consultantId,
                    action_id: action.id,
                  });
              }

              // Link action to new project
              await supabase
                .from('actions')
                .update({ project_id: newProject.id })
                .eq('id', action.id);

              toast.success(`Projeto FOCCO ${foccoNumber} criado. Carteira flutuante atualizada!`);
            } else if (projectError) {
              console.error('Error creating project from edit:', projectError);
              toast.error('Erro ao criar projeto da apresentação');
            }
          }
        } catch (err) {
          console.error('Error in apresentação flow:', err);
          toast.error('Erro ao processar apresentação de projeto');
        }
      } else if (form.presentedValue && selectedActionType?.enabledFields?.includes('presentedValue')) {
        // Fallback: legacy behavior for non-FOCCO presentations
        const presentedValueNum = safeNumber(form.presentedValue, { min: 0 });
        if (presentedValueNum !== null) {
          let projectId = action.projectId;
          if (!projectId && form.foccoProjectNumber) {
            const { data: proj } = await supabase
              .from('projects')
              .select('id')
              .eq('focco_project_number', form.foccoProjectNumber)
              .single();
            projectId = proj?.id;
          }
          if (projectId) {
            await supabase
              .from('projects')
              .update({ estimated_value: presentedValueNum })
              .eq('id', projectId);
          }
        }
      }

      if (!isApresentacaoProjeto && oldWasApresentacaoProjeto && action.projectId) {
        await supabase
          .from('projects')
          .update({ estimated_value: null })
          .eq('id', action.projectId);
      }

      toast.success('Ação atualizada com sucesso!');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['actions'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['credit_transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['carteira-flutuante-presentations'] }),
        queryClient.invalidateQueries({ queryKey: ['carteira-flutuante-value-history'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-action-presented-values'] }),
        queryClient.invalidateQueries({ queryKey: ['project_value_history'] }),
      ]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating action:', error);
      toast.error('Erro ao atualizar ação');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground border-black max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>EDITAR AÇÃO</DialogTitle>
            <DialogDescription>Edite a ação e sincronize seus impactos em carteira flutuante, projeto e Programa E.</DialogDescription>
        </DialogHeader>
        
        {!canEdit ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Você não tem permissão para editar esta ação.</p>
            <p className="text-sm mt-2">Apenas o criador ou administradores podem editar.</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.consultantId ? 'text-destructive' : 'text-muted-foreground'}`}>
                Consultor *
              </label>
              <select
                value={form.consultantId}
                onChange={(e) => {
                  setForm({ ...form, consultantId: e.target.value, professionalId: '' });
                  setErrors({ ...errors, consultantId: false });
                }}
                className={`input-flat w-full text-card-foreground ${errors.consultantId ? 'border-destructive ring-1 ring-destructive' : ''}`}
                disabled={!isAdmin}
              >
                <option value="">Selecione</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {errors.consultantId && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
              {!isAdmin && <span className="text-xs text-muted-foreground mt-1 block">Apenas admins podem alterar o consultor</span>}
            </div>

            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Especificador</label>
              <select
                value={form.professionalId}
                onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
                className="input-flat w-full text-card-foreground"
              >
                <option value="">Sem Especificador</option>
                {consultantProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.actionTypeId ? 'text-destructive' : 'text-muted-foreground'}`}>
                Tipo de Ação *
              </label>
              <select
                value={form.actionTypeId}
                onChange={(e) => {
                  setForm({ ...form, actionTypeId: e.target.value });
                  setErrors({ ...errors, actionTypeId: false });
                }}
                className={`input-flat w-full text-card-foreground ${errors.actionTypeId ? 'border-destructive ring-1 ring-destructive' : ''}`}
              >
                <option value="">Selecione</option>
                {actionTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {errors.actionTypeId && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
            </div>

            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.date ? 'text-destructive' : 'text-muted-foreground'}`}>
                Data *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => {
                  setForm({ ...form, date: e.target.value });
                  setErrors({ ...errors, date: false });
                }}
                className={`input-flat w-full text-card-foreground ${errors.date ? 'border-destructive ring-1 ring-destructive' : ''}`}
              />
              {errors.date && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
            </div>

            {selectedActionType?.requiresValue && selectedActionType.requiresValue !== 'nenhum' && (
              <div>
                <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.value ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {selectedActionType.requiresValue === 'ambientes' ? 'Quantidade de Ambientes *' : 'Valor da Venda (R$) *'}
                </label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => {
                    setForm({ ...form, value: e.target.value });
                    setErrors({ ...errors, value: false });
                  }}
                  placeholder={selectedActionType.requiresValue === 'ambientes' ? '0' : 'R$ 0,00'}
                  className={`input-flat w-full text-card-foreground ${errors.value ? 'border-destructive ring-1 ring-destructive' : ''}`}
                />
                {errors.value && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
              </div>
            )}

            {/* Aditivo: link to principal sale or create separate checklist */}
            {isVendaAditivo && (
              <div className="border border-amber-500/40 rounded-md p-3 bg-amber-500/5 space-y-2">
                <label className="text-xs tracking-widest uppercase text-muted-foreground block">
                  Aditivo — Destino do Checklist
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="radio" name="editAditivoLink" checked={form.aditivoLinkExisting}
                      onChange={() => setForm({ ...form, aditivoLinkExisting: true })} className="mt-1" />
                    <span><span className="font-medium">Vincular ao checklist da venda inicial</span> — soma o valor ao contrato existente. Se já houver checklist criado por este aditivo, ele será removido.</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="radio" name="editAditivoLink" checked={!form.aditivoLinkExisting}
                      onChange={() => setForm({ ...form, aditivoLinkExisting: false })} className="mt-1" />
                    <span><span className="font-medium">Manter/Criar checklist próprio</span> para este aditivo.</span>
                  </label>
                </div>
              </div>
            )}
            {isVenda && !isVendaAditivo && !action.projectId && (
              <div className="border border-border rounded-md p-3 space-y-3 bg-muted/30">
                <label className="text-xs tracking-widest uppercase text-muted-foreground block">
                  Atribuir Responsáveis do Checklist
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Ao salvar, o projeto e checklist serão criados automaticamente com os responsáveis selecionados.
                </p>
                
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Projetista Técnico
                  </label>
                  {projetistaMembers.length > 0 ? (
                    <select
                      value={form.assignedProjetistaId}
                      onChange={(e) => setForm({ ...form, assignedProjetistaId: e.target.value })}
                      className="input-flat w-full text-card-foreground"
                    >
                      <option value="">Selecione (opcional)</option>
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

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Analista de Logística
                  </label>
                  {logisticaMembers.length > 0 ? (
                    <select
                      value={form.assignedLogisticaId}
                      onChange={(e) => setForm({ ...form, assignedLogisticaId: e.target.value })}
                      className="input-flat w-full text-card-foreground"
                    >
                      <option value="">Selecione (opcional)</option>
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

            {selectedActionType?.additionalFields && selectedActionType.enabledFields?.length > 0 && (
              <>
                {selectedActionType.enabledFields.includes('clientName') && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nome do Cliente</label>
                    <input
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {selectedActionType.enabledFields.includes('clientAge') && (
                    <div>
                      <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Idade</label>
                      <input
                        type="number"
                        value={form.clientAge}
                        onChange={(e) => setForm({ ...form, clientAge: e.target.value })}
                        className="input-flat w-full text-card-foreground"
                      />
                    </div>
                  )}
                  {selectedActionType.enabledFields.includes('presentationNumber') && (
                    <div>
                      <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nº Apresentação</label>
                      <input
                        value={form.presentationNumber}
                        onChange={(e) => setForm({ ...form, presentationNumber: e.target.value })}
                        className="input-flat w-full text-card-foreground"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedActionType.enabledFields.includes('clientProfession') && (
                    <div>
                      <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Profissão</label>
                      <input
                        value={form.clientProfession}
                        onChange={(e) => setForm({ ...form, clientProfession: e.target.value })}
                        className="input-flat w-full text-card-foreground"
                      />
                    </div>
                  )}
                  {selectedActionType.enabledFields.includes('foccoProjectNumber') && (
                    <div>
                      <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nº Projeto FOCCO</label>
                      <input
                        value={form.foccoProjectNumber}
                        onChange={(e) => setForm({ ...form, foccoProjectNumber: e.target.value })}
                        className="input-flat w-full text-card-foreground"
                      />
                    </div>
                  )}
                </div>
                {selectedActionType.enabledFields.includes('presentedValue') && (
                  <div>
                    <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.presentedValue ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Valor Apresentado *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.presentedValue}
                      onChange={(e) => {
                        setForm({ ...form, presentedValue: e.target.value });
                        setErrors({ ...errors, presentedValue: false });
                      }}
                      placeholder="R$ 0,00"
                      className={`input-flat w-full text-card-foreground ${errors.presentedValue ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    />
                    {errors.presentedValue && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => onOpenChange(false)} 
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="btn-primary flex-1 bg-card-foreground text-card disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
