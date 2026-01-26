import { useState } from 'react';
import { Clock, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  useChecklistTemplates, 
  useUpdateTemplateSLA,
  getResponsibleAreaLabel,
  getWorkflowStatusLabel 
} from '@/hooks/useChecklist';

export function ChecklistSetupTab() {
  const { data: templates = [], isLoading } = useChecklistTemplates();
  const updateSLA = useUpdateTemplateSLA();
  const [editedSLAs, setEditedSLAs] = useState<Record<string, string>>({});

  const handleSLAChange = (templateId: string, value: string) => {
    setEditedSLAs(prev => ({ ...prev, [templateId]: value }));
  };

  const handleSave = async (templateId: string) => {
    const value = editedSLAs[templateId];
    const slaDays = value === '' ? null : parseInt(value, 10);
    
    if (value !== '' && (isNaN(slaDays!) || slaDays! < 0)) {
      return;
    }

    await updateSLA.mutateAsync({ templateId, slaDays });
    setEditedSLAs(prev => {
      const newState = { ...prev };
      delete newState[templateId];
      return newState;
    });
  };

  // Group templates by workflow status
  const groupedTemplates = templates.reduce((acc, template) => {
    const status = template.workflow_status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(template);
    return acc;
  }, {} as Record<string, typeof templates>);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Carregando templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="text-xs text-muted-foreground bg-muted/50 px-4 py-3 border border-border">
        <span className="font-medium">Configure os prazos (SLA)</span> para cada etapa do checklist de contratos.
        Os prazos são calculados em dias úteis a partir da ativação da etapa.
      </div>

      {/* Templates by Status Group */}
      {Object.entries(groupedTemplates).map(([status, statusTemplates]) => (
        <div key={status} className="space-y-3">
          <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium border-b border-border pb-2">
            {getWorkflowStatusLabel(status)}
          </h3>
          
          <div className="space-y-2">
            {statusTemplates.map((template) => {
              const currentValue = editedSLAs[template.id] ?? (template.default_sla_days?.toString() || '');
              const hasChanges = editedSLAs[template.id] !== undefined;

              return (
                <div 
                  key={template.id} 
                  className="flex items-center gap-4 p-3 border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        #{template.step_order}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {template.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getResponsibleAreaLabel(template.responsible_area)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Dias"
                      value={currentValue}
                      onChange={(e) => handleSLAChange(template.id, e.target.value)}
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">dias</span>
                    
                    {hasChanges && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSave(template.id)}
                        disabled={updateSLA.isPending}
                        className="h-8 px-2"
                      >
                        {updateSLA.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
