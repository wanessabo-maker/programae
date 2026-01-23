import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Check, Loader2, AlertCircle, FileText } from 'lucide-react';

interface Contract {
  id: string;
  contract_number: string;
  name: string;
  focco_project_number: string | null;
  client_id: string | null;
  clients?: { name: string } | null;
  professionals?: { name: string } | null;
}

interface ContractSelectorProps {
  value: string;
  onChange: (contractNumber: string, contract?: Contract) => void;
  professionalId?: string;
  hasError?: boolean;
  disabled?: boolean;
}

export function ContractSelector({
  value,
  onChange,
  professionalId,
  hasError = false,
  disabled = false,
}: ContractSelectorProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoading(true);
      try {
        // Fetch closed_won projects that have a contract number
        let query = supabase
          .from('projects')
          .select('id, focco_project_number, name, client_id, clients(name, contract_number), professionals(name)')
          .eq('stage', 'closed_won')
          .not('clients.contract_number', 'is', null)
          .order('closed_at', { ascending: false });

        // Filter by professional if provided and valid
        if (professionalId && professionalId !== 'none' && professionalId !== '') {
          query = query.eq('professional_id', professionalId);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching contracts:', error);
          return;
        }

        // Transform data to contract format
        const contractsData: Contract[] = (data || [])
          .filter(p => p.clients?.contract_number)
          .map(p => ({
            id: p.id,
            contract_number: p.clients?.contract_number || '',
            name: p.name,
            focco_project_number: p.focco_project_number,
            client_id: p.client_id,
            clients: p.clients ? { name: p.clients.name || '' } : null,
            professionals: p.professionals,
          }));

        setContracts(contractsData);
      } catch (err) {
        console.error('Error fetching contracts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, [professionalId]);

  const filteredContracts = contracts.filter(contract => {
    const search = searchTerm.toLowerCase();
    return (
      contract.contract_number.toLowerCase().includes(search) ||
      contract.name.toLowerCase().includes(search) ||
      contract.clients?.name?.toLowerCase().includes(search) ||
      contract.focco_project_number?.toLowerCase().includes(search)
    );
  });

  const handleSelect = (contract: Contract) => {
    onChange(contract.contract_number, contract);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedContract = contracts.find(c => c.contract_number === value);

  if (disabled) {
    return (
      <div className="input-flat w-full text-muted-foreground bg-muted/50 cursor-not-allowed">
        {value || 'Nenhum contrato'}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`input-flat w-full flex items-center justify-between text-left ${hasError ? 'border-destructive ring-1 ring-destructive' : ''}`}
      >
        <span className={value ? 'text-card-foreground font-medium' : 'text-muted-foreground'}>
          {selectedContract ? (
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-bold">{selectedContract.contract_number}</span>
              {selectedContract.clients?.name && (
                <span className="text-muted-foreground">- {selectedContract.clients.name}</span>
              )}
            </span>
          ) : (
            'Selecionar Contrato Vendido'
          )}
        </span>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />
          
          {/* Dropdown Content */}
          <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por contrato, cliente ou FOCCO..."
                className="input-flat w-full text-sm"
                autoFocus
              />
            </div>

            {/* Contracts List */}
            <div className="max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Carregando contratos...
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className="p-4 text-center">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchTerm 
                      ? 'Nenhum contrato encontrado' 
                      : 'Nenhum contrato vendido disponível'}
                  </p>
                </div>
              ) : (
                filteredContracts.map((contract) => (
                  <button
                    key={contract.id}
                    type="button"
                    onClick={() => handleSelect(contract)}
                    className="w-full p-3 text-left hover:bg-accent/50 flex items-start gap-3 border-b border-border last:border-b-0"
                  >
                    <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-card-foreground">
                          {contract.contract_number}
                        </span>
                        {contract.contract_number === value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {contract.clients?.name || 'Sem cliente'}
                      </p>
                      {contract.focco_project_number && (
                        <p className="text-xs text-muted-foreground">
                          FOCCO: {contract.focco_project_number}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                {filteredContracts.length} contrato(s) vendido(s)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
