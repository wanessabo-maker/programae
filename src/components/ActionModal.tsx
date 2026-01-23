import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryForAction, shouldUpdateProfessionalCategory } from '@/hooks/useProfessionalCategory';
import { findProjectByFocco } from '@/hooks/useProjects';
import { createClientDirect } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { SmartClientFields } from '@/components/SmartClientFields';
import { SmartClientData, updateClientData, fetchClientDataByFocco } from '@/hooks/useSmartClientData';

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

  const activeMembers = teamMembers.filter(m => m.active);

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

  const selectedActionType = actionTypes.find(t => t.id === form.actionTypeId);
  const consultantProfessionals = professionals.filter(p => p.consultantId === form.consultantId);
  
  // Check if this is an "Apresentação de Projeto" action type
  const isApresentacaoProjeto = selectedActionType?.name?.toLowerCase().includes('apresentação') && 
    selectedActionType?.name?.toLowerCase().includes('projeto');
  
  // Check if this is a "Venda" action type
  const isVenda = selectedActionType?.classification === 'venda';

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

  // Auto-fill FOCCO and client data when professional is selected for VENDA
  const autoFillForVenda = useCallback(async (professionalId: string) => {
    if (!professionalId || professionalId === 'none') return;
    
    try {
      // Find the most recent open project for this professional
      const { data: project, error } = await supabase
        .from('projects')
        .select('id, focco_project_number, client_id')
        .eq('professional_id', professionalId)
        .eq('stage', 'em_negociacao')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching project for professional:', error);
        return;
      }
      
      if (project?.focco_project_number) {
        // Set FOCCO number
        setForm(prev => ({ ...prev, foccoProjectNumber: project.focco_project_number }));
        
        // Fetch and set client data
        const clientData = await fetchClientDataByFocco(project.focco_project_number);
        if (clientData) {
          setForm(prev => ({
            ...prev,
            clientName: clientData.clientName || prev.clientName,
            clientCpfCnpj: clientData.clientCpfCnpj || prev.clientCpfCnpj,
            clientPhone: clientData.clientPhone || prev.clientPhone,
            clientEmail: clientData.clientEmail || prev.clientEmail,
            clientAddress: clientData.clientAddress || prev.clientAddress,
            clientCity: clientData.clientCity || prev.clientCity,
            clientState: clientData.clientState || prev.clientState,
            clientAge: clientData.clientAge || prev.clientAge,
            clientProfession: clientData.clientProfession || prev.clientProfession,
            contractNumber: clientData.contractNumber || prev.contractNumber,
            presentationNumber: clientData.presentationNumber || prev.presentationNumber,
          }));
          setLoadedClientData(clientData);
        }
      }
    } catch (err) {
      console.error('Error auto-filling for venda:', err);
    }
  }, []);

  // Trigger auto-fill when switching to VENDA with an existing professional selected
  const handleActionTypeChange = useCallback((actionTypeId: string) => {
    setForm(prev => ({ ...prev, actionTypeId }));
    if (errors.actionTypeId) {
      setErrors(prev => ({ ...prev, actionTypeId: false }));
    }
    
    // Check if new action type is VENDA
    const newActionType = actionTypes.find(t => t.id === actionTypeId);
    const isNewVenda = newActionType?.classification === 'venda';
    
    // If switching to VENDA and a professional is already selected, auto-fill
    if (isNewVenda && form.professionalId && form.professionalId !== 'none' && !isNewProfessional) {
      autoFillForVenda(form.professionalId);
    }
  }, [actionTypes, form.professionalId, isNewProfessional, errors.actionTypeId, autoFillForVenda]);

  // Trigger auto-fill when selecting a professional while VENDA is active
  const handleProfessionalChange = useCallback((professionalId: string) => {
    setForm(prev => ({ ...prev, professionalId }));
    
    // If VENDA is active and selecting an existing professional, auto-fill
    if (isVenda && professionalId && professionalId !== 'none') {
      autoFillForVenda(professionalId);
    }
  }, [isVenda, autoFillForVenda]);

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (!form.consultantId) newErrors.consultantId = true;
    if (!form.actionTypeId) newErrors.actionTypeId = true;
    if (!form.date) newErrors.date = true;
    
    // FOCCO number is required for Apresentação de Projeto and Venda
    if ((isApresentacaoProjeto || isVenda) && !form.foccoProjectNumber.trim()) {
      newErrors.foccoProjectNumber = true;
    }
    
    // Contract number is required for Venda
    if (isVenda && !form.contractNumber.trim()) {
      newErrors.contractNumber = true;
    }
    
    if (isNewProfessional) {
      if (!newProfessional.name) newErrors.professionalName = true;
      if (!newProfessional.typeId) newErrors.professionalType = true;
      if (professionalCategories.length === 0) {
        newErrors.noCategories = true;
      }
    }
    
    if (selectedActionType?.requiresValue && !form.value) {
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

        // Create reminder for special date if provided
        if (specialDate.date && specialDate.reason) {
          addReminder({
            title: `${specialDate.reason} - ${newProfessional.name}`,
            date: specialDate.date,
            consultantId: form.consultantId,
            type: specialDate.type === 'unica' ? 'avulso' : 'recorrente',
            professionalId: newId,
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

      const points = selectedActionType?.programPoints || 0;

      // Handle automatic project/client creation for Apresentação de Projeto
      let projectId: string | undefined = undefined;
      let clientId: string | null = loadedClientData?.clientId || null;
      
      if (isApresentacaoProjeto && form.foccoProjectNumber.trim()) {
        const foccoNumber = form.foccoProjectNumber.trim();
        
        try {
          const existingProject = await findProjectByFocco(foccoNumber);
          
          if (existingProject) {
            projectId = existingProject.id;
            
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
                age: form.clientAge ? Number(form.clientAge) : undefined,
                profession: form.clientProfession.trim() || undefined,
              });
            }
            toast.info(`Ação vinculada ao projeto FOCCO ${foccoNumber} existente`);
          } else {
            // Create new client if data provided
            if (form.clientName.trim()) {
              clientId = await createClientDirect({
                name: form.clientName.trim(),
                age: form.clientAge ? Number(form.clientAge) : null,
                profession: form.clientProfession || null,
                professional_id: professionalId || null,
                responsible_id: form.consultantId,
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
                client_id: clientId,
                stage: 'em_negociacao',
                start_date: form.date,
              })
              .select('id')
              .single();
            
            if (projectError) {
              console.error('Error creating project:', projectError);
              toast.error('Erro ao criar projeto automaticamente');
            } else if (newProject) {
              projectId = newProject.id;
              toast.success(`Projeto FOCCO ${foccoNumber} criado automaticamente`);
            }
          }
        } catch (err) {
          console.error('Error in project creation flow:', err);
        }
      }

      // Handle Venda - update project to closed_won and update client with full data
      if (isVenda && form.foccoProjectNumber.trim()) {
        const foccoNumber = form.foccoProjectNumber.trim();
        
        try {
          const existingProject = await findProjectByFocco(foccoNumber);
          
          if (existingProject) {
            const { error: updateError } = await supabase
              .from('projects')
              .update({
                stage: 'closed_won',
                closed_date: form.date,
                closed_value: form.value ? Number(form.value) : existingProject.estimated_value,
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
                  contract_number: form.contractNumber.trim(),
                  name: form.clientName.trim() || undefined,
                  cpf_cnpj: form.clientCpfCnpj.trim() || undefined,
                  phone: form.clientPhone.trim() || undefined,
                  email: form.clientEmail.trim() || undefined,
                  address: form.clientAddress.trim() || undefined,
                  city: form.clientCity.trim() || undefined,
                  state: form.clientState.trim() || undefined,
                  age: form.clientAge ? Number(form.clientAge) : undefined,
                  profession: form.clientProfession.trim() || undefined,
                });
                
                // Also update status to closed
                await supabase
                  .from('clients')
                  .update({ status: 'closed' })
                  .eq('id', existingProject.client_id);
              }
              
              toast.success(`Projeto FOCCO ${foccoNumber} fechado com sucesso!`);
            }
          } else {
            toast.error(`Projeto FOCCO ${foccoNumber} não encontrado. Registre uma Apresentação de Projeto primeiro.`);
            setIsSubmitting(false);
            return;
          }
        } catch (err) {
          console.error('Error in sale project update flow:', err);
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
            age: form.clientAge ? Number(form.clientAge) : undefined,
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
        value: form.value ? Number(form.value) : undefined,
        clientName: form.clientName || undefined,
        clientAge: form.clientAge ? Number(form.clientAge) : undefined,
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
          {/* Consultant Selection */}
          <div>
            <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.consultantId ? 'text-destructive' : 'text-muted-foreground'}`}>
              Consultor *
            </label>
            <select
              value={form.consultantId}
              onChange={(e) => {
                handleFieldChange('consultantId', e.target.value);
                handleFieldChange('professionalId', '');
              }}
              className={`input-flat w-full text-card-foreground ${errors.consultantId ? 'border-destructive ring-1 ring-destructive' : ''}`}
            >
              <option value="">Selecione</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {errors.consultantId && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
          </div>

          {/* Professional/Specifier Selection */}
          {form.consultantId && (
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Especificador</label>
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
              {!isNewProfessional && form.professionalId !== 'none' ? (
                <select
                  value={form.professionalId}
                  onChange={(e) => handleProfessionalChange(e.target.value)}
                  className="input-flat w-full text-card-foreground"
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
              onChange={(e) => handleActionTypeChange(e.target.value)}
              className={`input-flat w-full text-card-foreground ${errors.actionTypeId ? 'border-destructive ring-1 ring-destructive' : ''}`}
            >
              <option value="">Selecione</option>
              {actionTypes.map((t) => (
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

          {/* Value (for sales) */}
          {selectedActionType?.requiresValue && (
            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.value ? 'text-destructive' : 'text-muted-foreground'}`}>
                Valor da Venda *
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => handleFieldChange('value', e.target.value)}
                placeholder="R$ 0,00"
                className={`input-flat w-full text-card-foreground ${errors.value ? 'border-destructive ring-1 ring-destructive' : ''}`}
              />
              {errors.value && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
            </div>
          )}

          {/* Smart Client Fields - Always available */}
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
            }}
            onFieldChange={handleFieldChange}
            onBulkUpdate={handleBulkUpdate}
            onClientDataLoaded={handleClientDataLoaded}
            errors={errors}
            isVenda={isVenda}
            isApresentacao={isApresentacaoProjeto}
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
