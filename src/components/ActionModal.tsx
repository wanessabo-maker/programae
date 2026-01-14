import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryForAction } from '@/hooks/useProfessionalCategory';
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

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (!form.consultantId) newErrors.consultantId = true;
    if (!form.actionTypeId) newErrors.actionTypeId = true;
    if (!form.date) newErrors.date = true;
    
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
      let professionalId = form.professionalId;

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
          lastActionType: selectedActionType?.name,
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
      } else if (professionalId) {
        // Update existing professional with new category based on action
        updateProfessional(professionalId, {
          lastActionDate: form.date,
          lastActionType: selectedActionType?.name,
          categoryId: targetCategory?.id,
        });
      }

      const points = selectedActionType?.programPoints || 0;

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
        pointsGenerated: points,
      });

      if (!actionId) {
        toast.error('Erro ao registrar ação');
        setIsSubmitting(false);
        return;
      }

      // Add credits
      if (points > 0) {
        const professional = professionals.find(p => p.id === professionalId);
        addCreditTransaction({
          consultantId: form.consultantId,
          amount: points,
          type: 'ganho',
          description: `${selectedActionType?.name} - ${professional?.name || newProfessional.name}`,
          date: form.date,
          actionId: actionId,
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
              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!isNewProfessional}
                    onChange={() => setIsNewProfessional(false)}
                  />
                  Existente
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={isNewProfessional}
                    onChange={() => setIsNewProfessional(true)}
                  />
                  Novo
                </label>
              </div>
              {!isNewProfessional ? (
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
              ) : (
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
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Profissão</label>
                <input
                  value={form.clientProfession}
                  onChange={(e) => setForm({ ...form, clientProfession: e.target.value })}
                  className="input-flat w-full text-card-foreground"
                />
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