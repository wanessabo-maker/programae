import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryForAction, shouldUpdateProfessionalCategory } from '@/hooks/useProfessionalCategory';
import { findProjectByFocco } from '@/hooks/useProjects';
import { createClientDirect } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';

interface ActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    contractNumber: '',
    // Additional client fields for Venda
    clientPhone: '',
    clientEmail: '',
    clientCpfCnpj: '',
    clientAddress: '',
    clientCity: '',
    clientState: '',
  });

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

  const selectedActionType = actionTypes.find(t => t.id === form.actionTypeId);
  const consultantProfessionals = professionals.filter(p => p.consultantId === form.consultantId);
  
  // Check if this is an "Apresentação de Projeto" action type
  const isApresentacaoProjeto = selectedActionType?.name?.toLowerCase().includes('apresentação') && 
    selectedActionType?.name?.toLowerCase().includes('projeto');
  
  // Check if this is a "Venda" action type
  const isVenda = selectedActionType?.classification === 'venda';

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
    // Check for no categories first, before validateForm updates state
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
        // A higher-rank category (like ENCANTADO from VENDA) should be protected
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
            // Update existing professional with new category based on action
            updateProfessional(professionalId, {
              lastActionDate: form.date,
              lastActionTypeId: selectedActionType?.id,
              categoryId: targetCategory?.id,
            });
          }
          // If shouldUpdate is false, we keep the existing higher-rank category
        }
      }

      const points = selectedActionType?.programPoints || 0;

      // Handle automatic project/client creation for Apresentação de Projeto
      let projectId: string | undefined = undefined;
      
      if (isApresentacaoProjeto && form.foccoProjectNumber.trim()) {
        const foccoNumber = form.foccoProjectNumber.trim();
        
        try {
          // Check if project with this FOCCO number already exists
          const existingProject = await findProjectByFocco(foccoNumber);
          
          if (existingProject) {
            // Project exists - just link to it
            projectId = existingProject.id;
            toast.info(`Ação vinculada ao projeto FOCCO ${foccoNumber} existente`);
          } else {
            // Create new client if data provided
            let clientId: string | null = null;
            if (form.clientName.trim()) {
              clientId = await createClientDirect({
                name: form.clientName.trim(),
                age: form.clientAge ? Number(form.clientAge) : null,
                profession: form.clientProfession || null,
                professional_id: professionalId || null,
                responsible_id: form.consultantId,
                status: 'apresentado',
              });
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
            // Update project to closed_won
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
                const clientUpdateData: Record<string, unknown> = {
                  status: 'closed',
                  contract_number: form.contractNumber.trim(),
                };
                
                // Add optional fields if provided
                if (form.clientPhone.trim()) clientUpdateData.phone = form.clientPhone.trim();
                if (form.clientEmail.trim()) clientUpdateData.email = form.clientEmail.trim();
                if (form.clientCpfCnpj.trim()) clientUpdateData.cpf_cnpj = form.clientCpfCnpj.trim();
                if (form.clientAddress.trim()) clientUpdateData.address = form.clientAddress.trim();
                if (form.clientCity.trim()) clientUpdateData.city = form.clientCity.trim();
                if (form.clientState.trim()) clientUpdateData.state = form.clientState.trim();
                if (form.clientName.trim()) clientUpdateData.name = form.clientName.trim();
                if (form.clientAge) clientUpdateData.age = Number(form.clientAge);
                if (form.clientProfession.trim()) clientUpdateData.profession = form.clientProfession.trim();
                
                await supabase
                  .from('clients')
                  .update(clientUpdateData)
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
      setForm({
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
      });
      setIsNewProfessional(false);
      setNewProfessional({ name: '', typeId: '' });
      setSpecialDate({ date: '', reason: '', type: 'anual' });
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
            >
              <option value="">Selecione</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {errors.consultantId && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
          </div>

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
                      setForm({ ...form, professionalId: '' });
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
                      setForm({ ...form, professionalId: '' });
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
                      setForm({ ...form, professionalId: 'none' });
                    }}
                  />
                  Sem Especificador
                </label>
              </div>
              {!isNewProfessional && form.professionalId !== 'none' ? (
                <select
                  value={form.professionalId}
                  onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
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

          {selectedActionType?.requiresValue && (
            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.value ? 'text-destructive' : 'text-muted-foreground'}`}>
                Valor da Venda *
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => {
                  setForm({ ...form, value: e.target.value });
                  setErrors({ ...errors, value: false });
                }}
                placeholder="R$ 0,00"
                className={`input-flat w-full text-card-foreground ${errors.value ? 'border-destructive ring-1 ring-destructive' : ''}`}
              />
              {errors.value && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
            </div>
          )}

          {selectedActionType?.additionalFields && (
            <>
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nome do Cliente</label>
                <input
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  className="input-flat w-full text-card-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Idade</label>
                  <input
                    type="number"
                    value={form.clientAge}
                    onChange={(e) => setForm({ ...form, clientAge: e.target.value })}
                    className="input-flat w-full text-card-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nº Apresentação</label>
                  <input
                    value={form.presentationNumber}
                    onChange={(e) => setForm({ ...form, presentationNumber: e.target.value })}
                    className="input-flat w-full text-card-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Profissão</label>
                  <input
                    value={form.clientProfession}
                    onChange={(e) => setForm({ ...form, clientProfession: e.target.value })}
                    className="input-flat w-full text-card-foreground"
                  />
                </div>
                <div>
                  <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.foccoProjectNumber ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Nº Projeto FOCCO {(isApresentacaoProjeto || isVenda) ? '*' : ''}
                  </label>
                  <input
                    value={form.foccoProjectNumber}
                    onChange={(e) => {
                      setForm({ ...form, foccoProjectNumber: e.target.value });
                      setErrors({ ...errors, foccoProjectNumber: false });
                    }}
                    placeholder={(isApresentacaoProjeto || isVenda) ? 'Obrigatório' : 'Opcional'}
                    className={`input-flat w-full text-card-foreground ${errors.foccoProjectNumber ? 'border-destructive ring-1 ring-destructive' : ''}`}
                  />
                  {errors.foccoProjectNumber && (
                    <span className="text-xs text-destructive mt-1">
                      {isVenda ? 'Informe o projeto FOCCO para vincular a venda' : 'Campo obrigatório para Apresentação de Projeto'}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Campos específicos para VENDA */}
          {isVenda && (
            <>
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Dados da Venda</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.contractNumber ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Nº Contrato *
                    </label>
                    <input
                      value={form.contractNumber}
                      onChange={(e) => {
                        setForm({ ...form, contractNumber: e.target.value });
                        setErrors({ ...errors, contractNumber: false });
                      }}
                      placeholder="Obrigatório"
                      className={`input-flat w-full text-card-foreground ${errors.contractNumber ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    />
                    {errors.contractNumber && <span className="text-xs text-destructive mt-1">Campo obrigatório</span>}
                  </div>
                  <div>
                    <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.foccoProjectNumber ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Nº Projeto FOCCO *
                    </label>
                    <input
                      value={form.foccoProjectNumber}
                      onChange={(e) => {
                        setForm({ ...form, foccoProjectNumber: e.target.value });
                        setErrors({ ...errors, foccoProjectNumber: false });
                      }}
                      placeholder="Obrigatório"
                      className={`input-flat w-full text-card-foreground ${errors.foccoProjectNumber ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    />
                    {errors.foccoProjectNumber && <span className="text-xs text-destructive mt-1">Informe o projeto FOCCO para vincular a venda</span>}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Dados Adicionais do Cliente</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">CPF/CNPJ</label>
                    <input
                      value={form.clientCpfCnpj}
                      onChange={(e) => setForm({ ...form, clientCpfCnpj: e.target.value })}
                      placeholder="000.000.000-00"
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Telefone</label>
                    <input
                      value={form.clientPhone}
                      onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Email</label>
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                    placeholder="cliente@email.com"
                    className="input-flat w-full text-card-foreground"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Endereço</label>
                  <input
                    value={form.clientAddress}
                    onChange={(e) => setForm({ ...form, clientAddress: e.target.value })}
                    placeholder="Rua, número, complemento"
                    className="input-flat w-full text-card-foreground"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Cidade</label>
                    <input
                      value={form.clientCity}
                      onChange={(e) => setForm({ ...form, clientCity: e.target.value })}
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Estado</label>
                    <input
                      value={form.clientState}
                      onChange={(e) => setForm({ ...form, clientState: e.target.value })}
                      placeholder="UF"
                      maxLength={2}
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

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