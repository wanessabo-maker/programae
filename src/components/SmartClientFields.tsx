import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchClientDataByFocco, fetchClientDataByContract, SmartClientData } from '@/hooks/useSmartClientData';

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
  showAllFields = true,
}: SmartClientFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const lastFoccoRef = useRef<string>('');
  const lastContractRef = useRef<string>('');

  // Auto-fetch when FOCCO number already exists on mount (e.g., data passed from parent)
  useEffect(() => {
    const fetchExistingData = async () => {
      const focco = formData.foccoProjectNumber.trim();
      // Only auto-fetch if FOCCO exists and we haven't fetched it yet
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
  }, [formData.foccoProjectNumber]); // Re-run when FOCCO changes
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
    if (isVenda || isApresentacao) {
      setIsExpanded(true);
    }
  }, [isVenda, isApresentacao]);

  const hasAnyData = !!(
    formData.clientName || formData.clientCpfCnpj || formData.clientPhone || 
    formData.clientEmail || formData.clientAddress || formData.clientCity || 
    formData.clientState || formData.clientAge || formData.clientProfession ||
    formData.presentationNumber || formData.foccoProjectNumber || formData.contractNumber
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
          {/* Identification Fields - Always on top */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className={`text-xs tracking-widest uppercase block mb-2 ${errors.contractNumber ? 'text-destructive' : 'text-muted-foreground'}`}>
                Nº Contrato {isVenda && '*'}
              </label>
              <input
                value={formData.contractNumber}
                onChange={(e) => onFieldChange('contractNumber', e.target.value)}
                onBlur={handleContractBlur}
                placeholder={isVenda ? 'Obrigatório' : 'Opcional'}
                className={`input-flat w-full text-card-foreground ${errors.contractNumber ? 'border-destructive ring-1 ring-destructive' : ''}`}
              />
              {errors.contractNumber && (
                <span className="text-xs text-destructive mt-1">Campo obrigatório</span>
              )}
            </div>
          </div>

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

          {/* Divider */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
              Dados Pessoais
            </p>
          </div>

          {/* Client Personal Data */}
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                Profissão
              </label>
              <input
                value={formData.clientProfession}
                onChange={(e) => onFieldChange('clientProfession', e.target.value)}
                className="input-flat w-full text-card-foreground"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
              Endereço
            </p>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>
      )}
    </div>
  );
}
