import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calendar, Clock, Upload } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImportProfessionalsModal } from '@/components/ImportProfessionalsModal';
import { format, parseISO, differenceInDays, addDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateProfessionalCategory } from '@/hooks/useProfessionalCategory';

export default function Profissionais() {
  const {
    professionals,
    professionalTypes,
    professionalCategories,
    teamMembers,
    reminders,
    addProfessional,
    updateProfessional,
    deleteProfessional,
    addReminder,
    updateReminder,
    deleteReminder,
  } = useApp();

  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);

  const [professionalForm, setProfessionalForm] = useState({
    name: '',
    typeId: '',
    consultantId: '',
  });

  const [reminderForm, setReminderForm] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    consultantId: '',
    type: 'avulso' as 'avulso' | 'recorrente',
  });

  const activeMembers = teamMembers.filter(m => m.active);

  // Upcoming reminders (next 15 days)
  const upcomingReminders = useMemo(() => {
    const today = new Date();
    const in15Days = addDays(today, 15);
    
    return reminders
      .filter(r => {
        const reminderDate = parseISO(r.date);
        return isWithinInterval(reminderDate, { start: today, end: in15Days });
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(r => {
        const daysUntil = differenceInDays(parseISO(r.date), today);
        const consultant = teamMembers.find(m => m.id === r.consultantId);
        return {
          ...r,
          daysUntil,
          consultantName: consultant?.name,
        };
      });
  }, [reminders, teamMembers]);

  // Professionals with calculated categories based on last action and days
  const professionalsWithCalculatedCategories = useMemo(() => {
    return professionals.map(p => {
      const calculation = calculateProfessionalCategory(p, professionalCategories, []);
      return {
        ...p,
        calculatedCategoryId: calculation.categoryId,
        daysRemaining: calculation.daysRemaining,
        needsUpdate: p.categoryId !== calculation.categoryId,
      };
    });
  }, [professionals, professionalCategories]);

  // Auto-update categories when they expire
  useEffect(() => {
    professionalsWithCalculatedCategories.forEach(p => {
      if (p.needsUpdate) {
        updateProfessional(p.id, { categoryId: p.calculatedCategoryId });
      }
    });
  }, [professionalsWithCalculatedCategories, updateProfessional]);

  // Professionals by category using calculated category
  const professionalsByCategory = useMemo(() => {
    const sortedCategories = [...professionalCategories].sort((a, b) => a.order - b.order);
    
    return sortedCategories.map(category => {
      const categoryProfessionals = professionalsWithCalculatedCategories
        .filter(p => p.calculatedCategoryId === category.id)
        .map(p => {
          const type = professionalTypes.find(t => t.id === p.typeId);
          const consultant = teamMembers.find(m => m.id === p.consultantId);
          
          return {
            ...p,
            typeName: type?.name || '-',
            consultantName: consultant?.name || '-',
            daysUntilChange: p.daysRemaining,
          };
        });
      
      return {
        ...category,
        professionals: categoryProfessionals,
      };
    });
  }, [professionalsWithCalculatedCategories, professionalCategories, professionalTypes, teamMembers]);

  const handleSaveProfessional = () => {
    if (!professionalForm.name || !professionalForm.typeId || !professionalForm.consultantId) return;

    if (editingProfessional) {
      updateProfessional(editingProfessional, professionalForm);
    } else {
      addProfessional({
        ...professionalForm,
        categoryId: professionalCategories[professionalCategories.length - 1]?.id || '1',
      });
    }

    setProfessionalForm({ name: '', typeId: '', consultantId: '' });
    setEditingProfessional(null);
    setShowProfessionalModal(false);
  };

  const handleEditProfessional = (id: string) => {
    const prof = professionals.find(p => p.id === id);
    if (prof) {
      setProfessionalForm({
        name: prof.name,
        typeId: prof.typeId,
        consultantId: prof.consultantId,
      });
      setEditingProfessional(id);
      setShowProfessionalModal(true);
    }
  };

  const handleDeleteProfessional = (id: string) => {
    if (confirm('Excluir profissional e todas as ações vinculadas?')) {
      deleteProfessional(id);
    }
  };

  const handleSaveReminder = () => {
    if (!reminderForm.title || !reminderForm.date) return;

    if (editingReminder) {
      updateReminder(editingReminder, reminderForm);
    } else {
      addReminder(reminderForm);
    }

    setReminderForm({ title: '', date: format(new Date(), 'yyyy-MM-dd'), consultantId: '', type: 'avulso' });
    setEditingReminder(null);
    setShowReminderModal(false);
  };

  const getConsultantColor = (consultantId?: string) => {
    if (!consultantId) return 'bg-muted-foreground';
    const index = activeMembers.findIndex(m => m.id === consultantId);
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Profissionais</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary border-card-foreground text-card-foreground flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar Excel
          </button>
          <button
            onClick={() => setShowProfessionalModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Profissional
          </button>
        </div>
      </div>

      {/* Reminders */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="title-section mb-0">Lembretes (Próximos 15 dias)</h2>
          <button
            onClick={() => setShowReminderModal(true)}
            className="text-xs tracking-widest uppercase opacity-60 hover:opacity-100 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>
        
        {upcomingReminders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lembrete programado.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {upcomingReminders.map((reminder) => (
              <div key={reminder.id} className="card-flat relative">
                <div className={`absolute top-0 left-0 w-1 h-full ${getConsultantColor(reminder.consultantId)}`} />
                <div className="pl-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-lg font-light">{reminder.daysUntil}d</span>
                    </div>
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      className="opacity-40 hover:opacity-100 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm">{reminder.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(reminder.date), "dd 'de' MMM", { locale: ptBR })}
                    {reminder.consultantName && ` • ${reminder.consultantName}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Professionals by Category */}
      {professionalsByCategory.map((category) => (
        <section key={category.id}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="title-section mb-0">{category.name}</h2>
            <span className="text-xs text-muted-foreground">{category.professionals.length}</span>
          </div>
          
          {category.professionals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum profissional nesta categoria.</p>
          ) : (
            <div className="card-flat overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black">
                    <th className="table-header text-left p-3">Nome</th>
                    <th className="table-header text-left p-3">Tipo</th>
                    <th className="table-header text-left p-3">Consultor</th>
                    <th className="table-header text-left p-3">Última Ação</th>
                    <th className="table-header text-left p-3">Data</th>
                    <th className="table-header text-left p-3">Dias Restantes</th>
                    <th className="table-header text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {category.professionals.map((prof) => (
                    <tr key={prof.id} className="border-b border-black/10 last:border-0">
                      <td className="p-3 text-sm font-medium">{prof.name}</td>
                      <td className="p-3 text-sm">{prof.typeName}</td>
                      <td className="p-3 text-sm">{prof.consultantName}</td>
                      <td className="p-3 text-sm">{prof.lastActionType || '-'}</td>
                      <td className="p-3 text-sm">
                        {prof.lastActionDate ? format(parseISO(prof.lastActionDate), 'dd/MM') : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`text-sm ${prof.daysUntilChange <= 7 ? 'text-warning' : ''}`}>
                          {prof.daysUntilChange}d
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEditProfessional(prof.id)}
                            className="p-2 opacity-40 hover:opacity-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfessional(prof.id)}
                            className="p-2 opacity-40 hover:opacity-100 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {/* Professional Modal */}
      <Dialog open={showProfessionalModal} onOpenChange={setShowProfessionalModal}>
        <DialogContent className="bg-card text-card-foreground border-black max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProfessional ? 'EDITAR' : 'NOVO'} PROFISSIONAL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Nome</label>
              <input
                value={professionalForm.name}
                onChange={(e) => setProfessionalForm({ ...professionalForm, name: e.target.value })}
                className="input-flat w-full text-card-foreground"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Tipo</label>
              <select
                value={professionalForm.typeId}
                onChange={(e) => setProfessionalForm({ ...professionalForm, typeId: e.target.value })}
                className="input-flat w-full text-card-foreground"
              >
                <option value="">Selecione</option>
                {professionalTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Consultor</label>
              <select
                value={professionalForm.consultantId}
                onChange={(e) => setProfessionalForm({ ...professionalForm, consultantId: e.target.value })}
                className="input-flat w-full text-card-foreground"
              >
                <option value="">Selecione</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <button onClick={handleSaveProfessional} className="btn-primary w-full bg-card-foreground text-card">
              Salvar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder Modal */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent className="bg-card text-card-foreground border-black max-w-md">
          <DialogHeader>
            <DialogTitle>NOVO LEMBRETE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Título</label>
              <input
                value={reminderForm.title}
                onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                className="input-flat w-full text-card-foreground"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Data</label>
              <input
                type="date"
                value={reminderForm.date}
                onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                className="input-flat w-full text-card-foreground"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Consultor (opcional)</label>
              <select
                value={reminderForm.consultantId}
                onChange={(e) => setReminderForm({ ...reminderForm, consultantId: e.target.value })}
                className="input-flat w-full text-card-foreground"
              >
                <option value="">Todos</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Tipo</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={reminderForm.type === 'avulso'}
                    onChange={() => setReminderForm({ ...reminderForm, type: 'avulso' })}
                  />
                  Avulso
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={reminderForm.type === 'recorrente'}
                    onChange={() => setReminderForm({ ...reminderForm, type: 'recorrente' })}
                  />
                  Recorrente
                </label>
              </div>
            </div>
            <button onClick={handleSaveReminder} className="btn-primary w-full bg-card-foreground text-card">
              Salvar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <ImportProfessionalsModal open={showImportModal} onOpenChange={setShowImportModal} />
    </div>
  );
}
