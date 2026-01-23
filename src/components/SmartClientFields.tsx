import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchClientDataByFocco, fetchClientDataByContract, SmartClientData } from '@/hooks/useSmartClientData';
import { AdditionalFieldKey } from '@/types';
import { ProfessionAutocomplete } from './ProfessionAutocomplete';

interface ClientFormData {
  clientName: string;
  clientCpfCnpj: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientAge: string;
  clientProfession: string;
  presentationNumber: string;
  foccoProjectNumber: string;
  contractNumber: string;
}

interface SmartClientFieldsProps {
  formData: ClientFormData;
  onFieldChange: (field: keyof ClientFormData, value: string) => void;
  onBulkUpdate: (data: Partial<ClientFormData>) => void;
  onClientDataLoaded?: (data: SmartClientData) => void;
  errors?: Record<string, boolean>;
  enabledFields?: AdditionalFieldKey[]; // Fields enabled for this action type
  isVenda?: boolean;
  isApresentacao?: boolean;
}

// Field configuration with labels and grouping
const FIELD_CONFIG: Record<AdditionalFieldKey, { label: string; placeholder?: string; type?: string; maxLength?: number }> = {
  foccoProjectNumber: { label: 'Nº Projeto FOCCO', placeholder: 'Número do projeto' },
  contractNumber: { label: 'Nº Contrato', placeholder: 'Número do contrato' },
  presentationNumber: { label: 'Nº Apresentação', placeholder: 'Número da apresentação' },
  clientName: { label: 'Nome do Cliente', placeholder: 'Nome completo' },
  clientCpfCnpj: { label: 'CPF/CNPJ', placeholder: '000.000.000-00' },
  clientPhone: { label: 'Telefone', placeholder: '(00) 00000-0000' },
  clientEmail: { label: 'Email', placeholder: 'cliente@email.com', type: 'email' },
  clientAge: { label: 'Idade', type: 'number' },
  clientProfession: { label: 'Profissão', placeholder: 'Profissão do cliente' },
  clientAddress: { label: 'Endereço', placeholder: 'Rua, número, complemento' },
  clientCity: { label: 'Cidade', placeholder: 'Cidade' },
  clientState: { label: 'Estado', placeholder: 'UF', maxLength: 2 },
};

// Order of fields for display
const FIELD_ORDER: AdditionalFieldKey[] = [
  'foccoProjectNumber',
  'contractNumber', 
  'presentationNumber',
  'clientName',
  'clientCpfCnpj',
  'clientPhone',
  'clientEmail',
  'clientAge',
  'clientProfession',
  'clientAddress',
  'clientCity',
  'clientState',
];

export function SmartClientFields({
  formData,
  onFieldChange,
  onBulkUpdate,
  onClientDataLoaded,
  errors = {},
  enabledFields = [],
  isVenda = false,
  isApresentacao = false,
}: SmartClientFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const lastFoccoRef = useRef<string>('');
  const lastContractRef = useRef<string>('');

  // Determine which fields to show - only enabled fields
  const visibleFields = FIELD_ORDER.filter(field => enabledFields.includes(field));
  
  // Check if we have any fields to show
  const hasVisibleFields = visibleFields.length > 0;

  // Auto-fetch when FOCCO number already exists on mount (e.g., data passed from parent)
  useEffect(() => {
    const fetchExistingData = async () => {
      const focco = formData.foccoProjectNumber.trim();
      if (!focco || focco === lastFoccoRef.current) return;
      
      lastFoccoRef.current = focco;
      setIsLoading(true);
      
      try {
        const data = await fetchClientDataByFocco(focco);
        if (data) {
          const updates: Partial<ClientFormData> = {};
          if (!formData.clientName && data.clientName) updates.clientName = data.clientName;
          if (!formData.clientCpfCnpj && data.clientCpfCnpj) updates.clientCpfCnpj = data.clientCpfCnpj;
          if (!formData.clientPhone && data.clientPhone) updates.clientPhone = data.clientPhone;
          if (!formData.clientEmail && data.clientEmail) updates.clientEmail = data.clientEmail;
          if (!formData.clientAddress && data.clientAddress) updates.clientAddress = data.clientAddress;
          if (!formData.clientCity && data.clientCity) updates.clientCity = data.clientCity;
          if (!formData.clientState && data.clientState) updates.clientState = data.clientState;
          if (!formData.clientAge && data.clientAge) updates.clientAge = data.clientAge;
          if (!formData.clientProfession && data.clientProfession) updates.clientProfession = data.clientProfession;
          if (!formData.contractNumber && data.contractNumber) updates.contractNumber = data.contractNumber;
          
          if (Object.keys(updates).length > 0) {
            onBulkUpdate(updates);
            setDataLoaded(true);
            setIsExpanded(true);
          }
          
          onClientDataLoaded?.(data);
        }
      } catch (err) {
        console.error('Error auto-fetching client data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingData();
  }, [formData.foccoProjectNumber]);

  // Auto-fetch client data when FOCCO number changes
  const handleFoccoBlur = useCallback(async () => {
    const focco = formData.foccoProjectNumber.trim();
    if (!focco || focco === lastFoccoRef.current) return;
    
    lastFoccoRef.current = focco;
    setIsLoading(true);
    setDataLoaded(false);
    
    try {
      const data = await fetchClientDataByFocco(focco);
      if (data) {
        const updates: Partial<ClientFormData> = {};
        if (!formData.clientName && data.clientName) updates.clientName = data.clientName;
        if (!formData.clientCpfCnpj && data.clientCpfCnpj) updates.clientCpfCnpj = data.clientCpfCnpj;
        if (!formData.clientPhone && data.clientPhone) updates.clientPhone = data.clientPhone;
        if (!formData.clientEmail && data.clientEmail) updates.clientEmail = data.clientEmail;
        if (!formData.clientAddress && data.clientAddress) updates.clientAddress = data.clientAddress;
        if (!formData.clientCity && data.clientCity) updates.clientCity = data.clientCity;
        if (!formData.clientState && data.clientState) updates.clientState = data.clientState;
        if (!formData.clientAge && data.clientAge) updates.clientAge = data.clientAge;
        if (!formData.clientProfession && data.clientProfession) updates.clientProfession = data.clientProfession;
        if (!formData.contractNumber && data.contractNumber) updates.contractNumber = data.contractNumber;
        
        if (Object.keys(updates).length > 0) {
          onBulkUpdate(updates);
          setDataLoaded(true);
          setIsExpanded(true);
        }
        
        onClientDataLoaded?.(data);
      }
    } catch (err) {
      console.error('Error fetching client data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [formData, onBulkUpdate, onClientDataLoaded]);

  // Auto-fetch client data when Contract number changes
  const handleContractBlur = useCallback(async () => {
    const contract = formData.contractNumber.trim();
    if (!contract || contract === lastContractRef.current) return;
    
    lastContractRef.current = contract;
    setIsLoading(true);
    setDataLoaded(false);
    
    try {
      const data = await fetchClientDataByContract(contract);
      if (data) {
        const updates: Partial<ClientFormData> = {};
        if (!formData.clientName && data.clientName) updates.clientName = data.clientName;
        if (!formData.clientCpfCnpj && data.clientCpfCnpj) updates.clientCpfCnpj = data.clientCpfCnpj;
        if (!formData.clientPhone && data.clientPhone) updates.clientPhone = data.clientPhone;
        if (!formData.clientEmail && data.clientEmail) updates.clientEmail = data.clientEmail;
        if (!formData.clientAddress && data.clientAddress) updates.clientAddress = data.clientAddress;
        if (!formData.clientCity && data.clientCity) updates.clientCity = data.clientCity;
        if (!formData.clientState && data.clientState) updates.clientState = data.clientState;
        if (!formData.clientAge && data.clientAge) updates.clientAge = data.clientAge;
        if (!formData.clientProfession && data.clientProfession) updates.clientProfession = data.clientProfession;
        
        if (Object.keys(updates).length > 0) {
          onBulkUpdate(updates);
          setDataLoaded(true);
          setIsExpanded(true);
        }
        
        onClientDataLoaded?.(data);
      }
    } catch (err) {
      console.error('Error fetching client data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [formData, onBulkUpdate, onClientDataLoaded]);

  // Auto-expand when there are visible fields
  useEffect(() => {
    if (hasVisibleFields) {
      setIsExpanded(true);
    }
  }, [hasVisibleFields]);

  const hasAnyData = !!(
    formData.clientName || formData.clientCpfCnpj || formData.clientPhone || 
    formData.clientEmail || formData.clientAddress || formData.clientCity || 
    formData.clientState || formData.clientAge || formData.clientProfession ||
    formData.presentationNumber || formData.foccoProjectNumber || formData.contractNumber
  );

  // Don't render if no fields are enabled
  if (!hasVisibleFields) {
    return null;
  }

  // Helper to render a field
  const renderField = (fieldKey: AdditionalFieldKey) => {
    const config = FIELD_CONFIG[fieldKey];
    const isRequired = enabledFields.includes(fieldKey);
    const hasError = errors[fieldKey];
    const value = formData[fieldKey as keyof ClientFormData] || '';
    
    // Determine blur handler for special fields
    const getBlurHandler = () => {
      if (fieldKey === 'foccoProjectNumber') return handleFoccoBlur;
      if (fieldKey === 'contractNumber') return handleContractBlur;
      return undefined;
    };

    // Special handling for profession field - use autocomplete
    if (fieldKey === 'clientProfession') {
      return (
        <div key={fieldKey}>
          <label className={`text-xs tracking-widest uppercase block mb-2 ${hasError ? 'text-destructive' : 'text-muted-foreground'}`}>
            {config.label} {isRequired && '*'}
          </label>
          <ProfessionAutocomplete
            value={value}
            onChange={(newValue) => onFieldChange('clientProfession', newValue)}
            placeholder={config.placeholder || (isRequired ? 'Obrigatório' : 'Opcional')}
            required={isRequired}
            hasError={hasError}
          />
          {hasError && (
            <span className="text-xs text-destructive mt-1">Campo obrigatório</span>
          )}
        </div>
      );
    }

    return (
      <div key={fieldKey}>
        <label className={`text-xs tracking-widest uppercase block mb-2 ${hasError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {config.label} {isRequired && '*'}
        </label>
        <input
          type={config.type || 'text'}
          value={value}
          onChange={(e) => onFieldChange(fieldKey as keyof ClientFormData, e.target.value)}
          onBlur={getBlurHandler()}
          placeholder={config.placeholder || (isRequired ? 'Obrigatório' : 'Opcional')}
          maxLength={config.maxLength}
          className={`input-flat w-full text-card-foreground ${hasError ? 'border-destructive ring-1 ring-destructive' : ''}`}
        />
        {hasError && (
          <span className="text-xs text-destructive mt-1">Campo obrigatório</span>
        )}
      </div>
    );
  };

  // Group fields for better layout
  const identificationFields = visibleFields.filter(f => 
    ['foccoProjectNumber', 'contractNumber', 'presentationNumber'].includes(f)
  );
  const personalFields = visibleFields.filter(f => 
    ['clientName', 'clientCpfCnpj', 'clientPhone', 'clientEmail', 'clientAge', 'clientProfession'].includes(f)
  );
  const addressFields = visibleFields.filter(f => 
    ['clientAddress', 'clientCity', 'clientState'].includes(f)
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Dados Adicionais
          </span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {dataLoaded && !isLoading && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Dados carregados
            </span>
          )}
          {hasAnyData && !dataLoaded && !isLoading && (
            <span className="text-xs text-muted-foreground">• Dados preenchidos</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-border">
          {/* Identification Fields */}
          {identificationFields.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {identificationFields.map(field => renderField(field))}
            </div>
          )}

          {/* Personal Data Fields */}
          {personalFields.length > 0 && (
            <>
              {identificationFields.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                    Dados Pessoais
                  </p>
                </div>
              )}
              <div className="space-y-4">
                {/* Name takes full width */}
                {personalFields.includes('clientName') && renderField('clientName')}
                
                {/* Other personal fields in grid */}
                <div className="grid grid-cols-2 gap-4">
                  {personalFields.filter(f => f !== 'clientName').map(field => renderField(field))}
                </div>
              </div>
            </>
          )}

          {/* Address Fields */}
          {addressFields.length > 0 && (
            <>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                  Endereço
                </p>
              </div>
              <div className="space-y-4">
                {/* Address takes full width */}
                {addressFields.includes('clientAddress') && renderField('clientAddress')}
                
                {/* City and State in grid */}
                <div className="grid grid-cols-2 gap-4">
                  {addressFields.filter(f => f !== 'clientAddress').map(field => renderField(field))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
