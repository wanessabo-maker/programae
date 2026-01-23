import { useState, useEffect, useRef } from 'react';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  foccoNumber: string;
}

interface ContractSelectorProps {
  value: string;
  onChange: (contractNumber: string) => void;
  onContractSelect?: (contract: Contract) => void;
  error?: boolean;
  required?: boolean;
}

export function ContractSelector({
  value,
  onChange,
  onContractSelect,
  error = false,
  required = false,
}: ContractSelectorProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoading(true);
      try {
        // Fetch projects with closed_won stage that have contract numbers
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select(`
            id,
            focco_project_number,
            client_id,
            clients (
              id,
              name,
              contract_number
            )
          `)
          .eq('stage', 'closed_won')
          .order('closed_date', { ascending: false });

        if (projectsError) {
          console.error('Error fetching contracts:', projectsError);
          return;
        }

        console.log('ContractSelector - fetched projects:', projects);

        if (projectsError) {
          console.error('Error fetching contracts:', projectsError);
          return;
        }

        // Transform data to Contract format
        const contractsList: Contract[] = [];
        projects?.forEach((project) => {
          const client = project.clients as { id: string; name: string; contract_number: string } | null;
          if (client?.contract_number) {
            // Avoid duplicates
            if (!contractsList.find(c => c.contractNumber === client.contract_number)) {
              contractsList.push({
                id: project.id,
                contractNumber: client.contract_number,
                clientName: client.name || 'Cliente não identificado',
                foccoNumber: project.focco_project_number || '',
              });
            }
          }
        });

        setContracts(contractsList);
        setFilteredContracts(contractsList);
      } catch (err) {
        console.error('Error fetching contracts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, []);

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setInputValue(searchValue);
    onChange(searchValue);
    
    // Filter contracts based on input
    if (searchValue.trim()) {
      const filtered = contracts.filter(c => 
        c.contractNumber.toLowerCase().includes(searchValue.toLowerCase()) ||
        c.clientName.toLowerCase().includes(searchValue.toLowerCase()) ||
        c.foccoNumber.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredContracts(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredContracts(contracts);
      setShowSuggestions(contracts.length > 0);
    }
  };

  const handleFocus = () => {
    if (inputValue.trim()) {
      const filtered = contracts.filter(c => 
        c.contractNumber.toLowerCase().includes(inputValue.toLowerCase()) ||
        c.clientName.toLowerCase().includes(inputValue.toLowerCase()) ||
        c.foccoNumber.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredContracts(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredContracts(contracts);
      setShowSuggestions(contracts.length > 0);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSelectContract = (contract: Contract) => {
    setInputValue(contract.contractNumber);
    onChange(contract.contractNumber);
    setShowSuggestions(false);
    
    if (onContractSelect) {
      onContractSelect(contract);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 input-flat w-full text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando contratos...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={required ? 'Digite para buscar contrato *' : 'Digite para buscar contrato'}
          className={`input-flat w-full pl-9 text-card-foreground ${error ? 'border-destructive ring-1 ring-destructive' : ''}`}
          autoComplete="off"
        />
      </div>
      
      {/* Suggestions Dropdown */}
      {showSuggestions && filteredContracts.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredContracts.slice(0, 10).map((contract) => (
            <button
              key={contract.contractNumber}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectContract(contract);
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{contract.contractNumber}</span>
                {contract.foccoNumber && (
                  <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                    FOCCO {contract.foccoNumber}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground block mt-0.5">
                {contract.clientName}
              </span>
            </button>
          ))}
          {filteredContracts.length > 10 && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
              +{filteredContracts.length - 10} mais...
            </div>
          )}
        </div>
      )}
      
      {/* No results message */}
      {showSuggestions && filteredContracts.length === 0 && inputValue.trim() && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg p-3">
          <p className="text-xs text-muted-foreground">
            Nenhum contrato encontrado para "{inputValue}"
          </p>
        </div>
      )}
    </div>
  );
}
