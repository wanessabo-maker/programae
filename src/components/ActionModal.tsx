import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';

interface ActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActionModal({ open, onOpenChange }: ActionModalProps) {
  const { 
    teamMembers, 
    professionals, 
    professionalTypes,
    actionTypes, 
    addAction, 
    addProfessional,
    addCreditTransaction,
    updateProfessional 
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

  const selectedActionType = actionTypes.find(t => t.id === form.actionTypeId);
  const consultantProfessionals = professionals.filter(p => p.consultantId === form.consultantId);

  const handleSubmit = () => {
    if (!form.consultantId || !form.actionTypeId || !form.date) return;

    let professionalId = form.professionalId;

    // Create new professional if needed
    if (isNewProfessional && newProfessional.name && newProfessional.typeId) {
      const newId = Math.random().toString(36).substr(2, 9);
      addProfessional({
        name: newProfessional.name,
        typeId: newProfessional.typeId,
        consultantId: form.consultantId,
        categoryId: '1', // Default to first category
        lastActionDate: form.date,
        lastActionType: selectedActionType?.name,
      });
      professionalId = newId;
    } else if (professionalId) {
      // Update existing professional
      updateProfessional(professionalId, {
        lastActionDate: form.date,
        lastActionType: selectedActionType?.name,
      });
    }

    const points = selectedActionType?.programPoints || 0;

    // Add action
    addAction({
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

    // Add credits
    if (points > 0) {
      const professional = professionals.find(p => p.id === professionalId);
      addCreditTransaction({
        consultantId: form.consultantId,
        amount: points,
        type: 'ganho',
        description: `${selectedActionType?.name} - ${professional?.name || newProfessional.name}`,
        date: form.date,
      });
    }

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground border-black max-w-lg">
        <DialogHeader>
          <DialogTitle>REGISTRAR AÇÃO</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Consultor</label>
            <select
              value={form.consultantId}
              onChange={(e) => setForm({ ...form, consultantId: e.target.value, professionalId: '' })}
              className="input-flat w-full text-card-foreground"
            >
              <option value="">Selecione</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
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
                <div className="space-y-2">
                  <input
                    value={newProfessional.name}
                    onChange={(e) => setNewProfessional({ ...newProfessional, name: e.target.value })}
                    placeholder="Nome do profissional"
                    className="input-flat w-full text-card-foreground"
                  />
                  <select
                    value={newProfessional.typeId}
                    onChange={(e) => setNewProfessional({ ...newProfessional, typeId: e.target.value })}
                    className="input-flat w-full text-card-foreground"
                  >
                    <option value="">Tipo de profissional</option>
                    {professionalTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Tipo de Ação</label>
            <select
              value={form.actionTypeId}
              onChange={(e) => setForm({ ...form, actionTypeId: e.target.value })}
              className="input-flat w-full text-card-foreground"
            >
              <option value="">Selecione</option>
              {actionTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Data</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-flat w-full text-card-foreground"
            />
          </div>

          {selectedActionType?.requiresValue && (
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Valor da Venda</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="R$ 0,00"
                className="input-flat w-full text-card-foreground"
              />
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

          <button onClick={handleSubmit} className="btn-primary w-full bg-card-foreground text-card mt-4">
            Registrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
