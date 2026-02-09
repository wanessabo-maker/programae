import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Action } from '@/types';
import { safeNumber, safeParseInt } from '@/lib/validators';

interface EditActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: Action | null;
}

export function EditActionModal({ open, onOpenChange, action }: EditActionModalProps) {
  const { isAdmin } = useAuthContext();
  const { data: currentTeamMember } = useCurrentTeamMember();
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

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
      });
    }
  }, [action]);

  const selectedActionType = actionTypes.find(t => t.id === form.actionTypeId);
  const consultantProfessionals = professionals.filter(p => p.consultantId === form.consultantId);

  // Check if user can edit this action
  const canEdit = isAdmin || (currentTeamMember?.id && action?.consultantId === currentTeamMember.id);

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (!form.consultantId) newErrors.consultantId = true;
    if (!form.actionTypeId) newErrors.actionTypeId = true;
    if (!form.date) newErrors.date = true;
    
    if (selectedActionType?.requiresValue && !form.value) {
      newErrors.value = true;
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
      const oldActionType = actionTypes.find(t => t.id === action.actionTypeId);
      const newActionType = actionTypes.find(t => t.id === form.actionTypeId);
      const oldPoints = oldActionType?.programPoints || 0;
      const newPoints = newActionType?.programPoints || 0;

      // Update the action
      await updateAction(action.id, {
        consultantId: form.consultantId,
        professionalId: form.professionalId || undefined,
        actionTypeId: form.actionTypeId,
        date: form.date,
        value: safeNumber(form.value, { min: 0 }) ?? undefined,
        clientName: form.clientName || undefined,
        clientAge: safeParseInt(form.clientAge, { min: 0, max: 150 }) ?? undefined,
        clientProfession: form.clientProfession || undefined,
        presentationNumber: form.presentationNumber || undefined,
      });

      // Update focco_project_number directly (not in updateAction)
      if (form.foccoProjectNumber !== action.foccoProjectNumber) {
        await supabase
          .from('actions')
          .update({ focco_project_number: form.foccoProjectNumber || null })
          .eq('id', action.id);
      }

      // Handle credit transaction updates
      const existingCredit = creditTransactions.find(ct => ct.actionId === action.id && ct.type === 'ganho');
      
      // If consultant changed, update the credit transaction consultant
      const consultantChanged = form.consultantId !== action.consultantId;
      // If points changed (different action type), update the amount
      const pointsChanged = newPoints !== oldPoints;
      
      if (existingCredit) {
        if (newPoints === 0) {
          // New action type has no points - delete the credit
          deleteCreditTransaction(existingCredit.id);
        } else if (pointsChanged || consultantChanged) {
          // Update existing credit transaction
          const professional = form.professionalId ? professionals.find(p => p.id === form.professionalId) : null;
          const professionalName = professional?.name || 'Sem Especificador';
          
          updateCreditTransaction(existingCredit.id, {
            consultantId: form.consultantId,
            amount: newPoints,
            description: `${newActionType?.name} - ${professionalName}`,
            date: form.date,
          });
        }
      } else if (newPoints > 0) {
        // No existing credit but new action type has points - create one
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

      // Update project if focco number changed and project exists
      if (action.projectId && form.foccoProjectNumber !== action.foccoProjectNumber) {
        await supabase
          .from('projects')
          .update({ focco_project_number: form.foccoProjectNumber || null })
          .eq('id', action.projectId);
      }

      // If value changed for a sale, update project closed_value
      if (action.projectId && form.value !== action.value?.toString()) {
        const actionType = actionTypes.find(t => t.id === form.actionTypeId);
        if (actionType?.classification === 'venda') {
          await supabase
            .from('projects')
            .update({ closed_value: safeNumber(form.value, { min: 0 }) })
            .eq('id', action.projectId);
        }
      }

      toast.success('Ação atualizada com sucesso!');
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
                disabled={!isAdmin} // Only admin can change consultant
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
