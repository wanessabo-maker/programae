import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchClientDataByFocco, fetchClientDataByContract, SmartClientData } from '@/hooks/useSmartClientData';
import { ContractSelector } from '@/components/ContractSelector';
import { AdditionalFieldKey } from '@/types';
import { useProfessions } from '@/hooks/useProfessions';

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
  isVenda?: boolean;
  isApresentacao?: boolean;
  isSeletiva?: boolean;
  enabledFields?: AdditionalFieldKey[];
  showAllFields?: boolean;
}

export function SmartClientFields({
  formData,
  onFieldChange,
  onBulkUpdate,
  onClientDataLoaded,
  errors = {},
  isVenda = false,
  isApresentacao = false,
  isSeletiva = false,
  enabledFields = [],
  showAllFields = false,
}: SmartClientFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const lastFoccoRef = useRef<string>('');
  const lastContractRef = useRef<string>('');
  
  // Profession autocomplete state
  const { professions } = useProfessions();
  const [showProfessionSuggestions, setShowProfessionSuggestions] = useState(false);
  const [filteredProfessions, setFilteredProfessions] = useState<string[]>([]);
  const professionInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if a field is enabled
  const isFieldEnabled = useCallback((field: AdditionalFieldKey) => {
    if (showAllFields) return true;
    return enabledFields.includes(field);
  }, [enabledFields, showAllFields]);

  // Check if any fields are enabled
  const hasAnyEnabledFields = showAllFields || enabledFields.length > 0;

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
        // Only update empty fields (don't overwrite user input)
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
  }, [formData.foccoProjectNumber, formData.clientName, formData.clientCpfCnpj, formData.clientPhone, formData.clientEmail, formData.clientAddress, formData.clientCity, formData.clientState, formData.clientAge, formData.clientProfession, formData.contractNumber, onBulkUpdate, onClientDataLoaded]);

  // Auto-fetch client data when Contract number changes (for CS/AT areas)
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
  }, [formData.contractNumber, formData.clientName, formData.clientCpfCnpj, formData.clientPhone, formData.clientEmail, formData.clientAddress, formData.clientCity, formData.clientState, formData.clientAge, formData.clientProfession, onBulkUpdate, onClientDataLoaded]);

  // Auto-expand when required fields are present
  useEffect(() => {
    if (isVenda || isApresentacao || isSeletiva || hasAnyEnabledFields) {
      setIsExpanded(true);
    }
  }, [isVenda, isApresentacao, isSeletiva, hasAnyEnabledFields]);

  // Handle contract selection from selector (for seletiva actions)
  const handleContractSelect = useCallback(async (contract: { contractNumber: string }) => {
    const contractNumber = contract.contractNumber;
    onFieldChange('contractNumber', contractNumber);
    
    // Fetch client data for this contract
    setIsLoading(true);
    setDataLoaded(false);
    
    try {
      const data = await fetchClientDataByContract(contractNumber);
      if (data) {
        const updates: Partial<ClientFormData> = {};
        if (data.clientName) updates.clientName = data.clientName;
        if (data.clientCpfCnpj) updates.clientCpfCnpj = data.clientCpfCnpj;
        if (data.clientPhone) updates.clientPhone = data.clientPhone;
        if (data.clientEmail) updates.clientEmail = data.clientEmail;
        if (data.clientAddress) updates.clientAddress = data.clientAddress;
        if (data.clientCity) updates.clientCity = data.clientCity;
        if (data.clientState) updates.clientState = data.clientState;
        if (data.clientAge) updates.clientAge = data.clientAge;
        if (data.clientProfession) updates.clientProfession = data.clientProfession;
        if (data.presentationNumber) updates.presentationNumber = data.presentationNumber;
        
        if (Object.keys(updates).length > 0) {
          onBulkUpdate(updates);
          setDataLoaded(true);
        }
        
        onClientDataLoaded?.(data);
      }
    } catch (err) {
      console.error('Error fetching client data from contract:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onFieldChange, onBulkUpdate, onClientDataLoaded]);

  const hasAnyData = !!(
    formData.clientName || formData.clientCpfCnpj || formData.clientPhone || 
    formData.clientEmail || formData.clientAddress || formData.clientCity || 
    formData.clientState || formData.clientAge || formData.clientProfession ||
    formData.presentationNumber || formData.foccoProjectNumber || formData.contractNumber
  );

  // If no fields are enabled and not a special action type, don't render anything
  if (!hasAnyEnabledFields && !isVenda && !isApresentacao && !isSeletiva) {
    return null;
  }

  // Check if any personal data fields are enabled
  const hasPersonalFields = isFieldEnabled('clientName') || isFieldEnabled('clientAge') || 
    isFieldEnabled('clientProfession') || isFieldEnabled('clientPhone') || 
    isFieldEnabled('clientEmail') || isFieldEnabled('clientCpfCnpj');

  // Check if any address fields are enabled
  const hasAddressFields = isFieldEnabled('clientAddress') || isFieldEnabled('clientCity') || 
    isFieldEnabled('clientState');

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
            Dados do Cliente / Projeto
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
          <div className="grid grid-cols-2 gap-4">
            {/* FOCCO Project Number - show if enabled or if special action type */}
            {(isFieldEnabled('foccoProjectNumber') || isApresentacao || isVenda) && (
              <div>
                <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.foccoProjectNumber ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Nº Projeto FOCCO {(isApresentacao || isVenda) && '*'}
                </label>
                <input
                  value={formData.foccoProjectNumber}
                  onChange={(e) => onFieldChange('foccoProjectNumber', e.target.value)}
                  onBlur={handleFoccoBlur}
                  placeholder={isApresentacao || isVenda ? 'Obrigatório' : 'Opcional'}
                  className={`input-flat w-full text-card-foreground ${errors.foccoProjectNumber ? 'border-destructive ring-1 ring-destructive' : ''}`}
                />
                {errors.foccoProjectNumber && (
                  <span className="text-xs text-destructive mt-1">Campo obrigatório</span>
                )}
              </div>
            )}
            
            {/* Contract Number - show if enabled or if special action type */}
            {(isFieldEnabled('contractNumber') || isVenda || isSeletiva) && (
              <div>
                <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.contractNumber ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Nº Contrato {(isVenda || isSeletiva) && '*'}
                </label>
                {isSeletiva ? (
                  <ContractSelector
                    value={formData.contractNumber}
                    onChange={(value) => onFieldChange('contractNumber', value)}
                    onContractSelect={handleContractSelect}
                    error={errors.contractNumber}
                    required={true}
                  />
                ) : (
                  <input
                    value={formData.contractNumber}
                    onChange={(e) => onFieldChange('contractNumber', e.target.value)}
                    onBlur={handleContractBlur}
                    placeholder={isVenda ? 'Obrigatório' : 'Opcional'}
                    className={`input-flat w-full text-card-foreground ${errors.contractNumber ? 'border-destructive ring-1 ring-destructive' : ''}`}
                  />
                )}
                {errors.contractNumber && (
                  <span className="text-xs text-destructive mt-1">Campo obrigatório</span>
                )}
              </div>
            )}
          </div>

          {/* Presentation Number */}
          {isFieldEnabled('presentationNumber') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                  Nº Apresentação
                </label>
                <input
                  value={formData.presentationNumber}
                  onChange={(e) => onFieldChange('presentationNumber', e.target.value)}
                  className="input-flat w-full text-card-foreground"
                />
              </div>
            </div>
          )}

          {/* Personal Data Section */}
          {hasPersonalFields && (
            <>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                  Dados Pessoais
                </p>
              </div>

              {isFieldEnabled('clientName') && (
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                    Nome do Cliente
                  </label>
                  <input
                    value={formData.clientName}
                    onChange={(e) => onFieldChange('clientName', e.target.value)}
                    className="input-flat w-full text-card-foreground"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {isFieldEnabled('clientCpfCnpj') && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                      CPF/CNPJ
                    </label>
                    <input
                      value={formData.clientCpfCnpj}
                      onChange={(e) => onFieldChange('clientCpfCnpj', e.target.value)}
                      placeholder="000.000.000-00"
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                )}
                {isFieldEnabled('clientPhone') && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                      Telefone
                    </label>
                    <input
                      value={formData.clientPhone}
                      onChange={(e) => onFieldChange('clientPhone', e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                )}
              </div>

              {isFieldEnabled('clientEmail') && (
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => onFieldChange('clientEmail', e.target.value)}
                    placeholder="cliente@email.com"
                    className="input-flat w-full text-card-foreground"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {isFieldEnabled('clientAge') && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                      Idade
                    </label>
                    <input
                      type="number"
                      value={formData.clientAge}
                      onChange={(e) => onFieldChange('clientAge', e.target.value)}
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                )}
                {isFieldEnabled('clientProfession') && (
                  <div className="relative">
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                      Profissão
                    </label>
                    <input
                      ref={professionInputRef}
                      value={formData.clientProfession}
                      onChange={(e) => {
                        const value = e.target.value;
                        onFieldChange('clientProfession', value);
                        
                        // Filter professions based on input
                        if (value.trim()) {
                          const filtered = professions.filter(p => 
                            p.toLowerCase().includes(value.toLowerCase())
                          );
                          setFilteredProfessions(filtered);
                          setShowProfessionSuggestions(filtered.length > 0);
                        } else {
                          setFilteredProfessions(professions);
                          setShowProfessionSuggestions(professions.length > 0);
                        }
                      }}
                      onFocus={() => {
                        const value = formData.clientProfession.trim();
                        if (value) {
                          const filtered = professions.filter(p => 
                            p.toLowerCase().includes(value.toLowerCase())
                          );
                          setFilteredProfessions(filtered);
                          setShowProfessionSuggestions(filtered.length > 0);
                        } else {
                          setFilteredProfessions(professions);
                          setShowProfessionSuggestions(professions.length > 0);
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow click on suggestion
                        setTimeout(() => setShowProfessionSuggestions(false), 200);
                      }}
                      placeholder="Digite para buscar..."
                      className="input-flat w-full text-card-foreground"
                      autoComplete="off"
                    />
                    
                    {/* Profession Suggestions Dropdown */}
                    {showProfessionSuggestions && filteredProfessions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                        {filteredProfessions.slice(0, 10).map((profession, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onFieldChange('clientProfession', profession);
                              setShowProfessionSuggestions(false);
                            }}
                          >
                            {profession}
                          </button>
                        ))}
                        {filteredProfessions.length > 10 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                            +{filteredProfessions.length - 10} mais...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Address Section */}
          {hasAddressFields && (
            <>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                  Endereço
                </p>
              </div>

              {isFieldEnabled('clientAddress') && (
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                    Endereço
                  </label>
                  <input
                    value={formData.clientAddress}
                    onChange={(e) => onFieldChange('clientAddress', e.target.value)}
                    placeholder="Rua, número, complemento"
                    className="input-flat w-full text-card-foreground"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {isFieldEnabled('clientCity') && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                      Cidade
                    </label>
                    <input
                      value={formData.clientCity}
                      onChange={(e) => onFieldChange('clientCity', e.target.value)}
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                )}
                {isFieldEnabled('clientState') && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                      Estado
                    </label>
                    <input
                      value={formData.clientState}
                      onChange={(e) => onFieldChange('clientState', e.target.value)}
                      placeholder="UF"
                      maxLength={2}
                      className="input-flat w-full text-card-foreground"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
