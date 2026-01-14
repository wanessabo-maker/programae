import { useState, useEffect } from 'react';
import { Check, Info } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSetting } from '@/hooks/useDatabase';
import { CreditValiditySettings } from '@/types';
import { toast } from 'sonner';

export function ValiditySettingsTab() {
  const { data: settings } = useSystemSettings();
  const updateSetting = useUpdateSystemSetting();
  
  // Credit validity state
  const [creditValidityType, setCreditValidityType] = useState<'mensal' | 'anual' | 'dias' | 'sem_validade'>('anual');
  const [creditValidityDays, setCreditValidityDays] = useState(365);
  
  // Load current settings
  useEffect(() => {
    if (settings) {
      const creditSetting = settings.find(s => s.key === 'credit_validity');
      if (creditSetting?.value) {
        const val = creditSetting.value as unknown as CreditValiditySettings;
        setCreditValidityType(val.type || 'anual');
        setCreditValidityDays(val.days || 365);
      }
    }
  }, [settings]);

  const handleSaveCreditValidity = () => {
    const value: CreditValiditySettings = {
      type: creditValidityType,
      days: creditValidityType === 'dias' ? creditValidityDays : 
            creditValidityType === 'mensal' ? 30 :
            creditValidityType === 'anual' ? 365 : undefined,
    };
    
    updateSetting.mutate(
      { key: 'credit_validity', value: value as unknown as Record<string, unknown> },
      {
        onSuccess: () => toast.success('Configuração de validade de créditos salva!'),
        onError: () => toast.error('Erro ao salvar configuração'),
      }
    );
  };

  const validityTypeLabels = {
    mensal: 'Mensal (30 dias)',
    anual: 'Anual (365 dias)',
    dias: 'Por número de dias',
    sem_validade: 'Sem validade',
  };

  return (
    <div className="space-y-8">
      {/* Credit Validity Section */}
      <section>
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <span>Validade dos Créditos (Programa E+)</span>
        </h3>
        
        <div className="bg-muted/30 border border-black/10 p-4 mb-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Define por quanto tempo os créditos gerados no Programa E+ permanecem válidos. 
              Créditos expirados não podem ser utilizados. A regra aplicada será a vigente no momento 
              da geração do crédito. Alterações não retroagem créditos já gerados.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            {(Object.entries(validityTypeLabels) as [typeof creditValidityType, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setCreditValidityType(value)}
                className={`w-full p-3 border text-left flex items-center justify-between ${
                  creditValidityType === value 
                    ? 'border-black bg-black text-white' 
                    : 'border-black/30 hover:border-black'
                }`}
              >
                <span className="text-sm">{label}</span>
                {creditValidityType === value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {creditValidityType === 'dias' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={creditValidityDays}
                onChange={(e) => setCreditValidityDays(Number(e.target.value))}
                min={1}
                max={730}
                className="input-flat w-24 text-card-foreground"
              />
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
          )}

          <button
            onClick={handleSaveCreditValidity}
            className="btn-primary bg-card-foreground text-card flex items-center gap-2"
            disabled={updateSetting.isPending}
          >
            <Check className="w-4 h-4" />
            {updateSetting.isPending ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </section>

      {/* Informational Section */}
      <section>
        <h3 className="text-sm font-medium mb-4">Regras de Validade das Metas</h3>
        
        <div className="bg-muted/30 border border-black/10 p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                A validade das metas é configurada individualmente na aba "Metas" ao criar ou editar cada meta.
              </p>
              <p>
                <strong>Tipos disponíveis:</strong> Mensal, Trimestral, Semestral, Anual ou Personalizada (data inicial e final).
              </p>
              <p>
                Metas fora do período de validade são automaticamente marcadas como expiradas e não acumulam resultados, 
                mas permanecem visíveis para histórico.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
