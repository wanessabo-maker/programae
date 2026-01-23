import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);

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
          .not('clients.contract_number', 'is', null)
          .order('closed_date', { ascending: false });

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
      } catch (err) {
        console.error('Error fetching contracts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue);
    
    if (selectedValue && onContractSelect) {
      const contract = contracts.find(c => c.contractNumber === selectedValue);
      if (contract) {
        onContractSelect(contract);
      }
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
    <select
      value={value}
      onChange={handleChange}
      className={`input-flat w-full text-card-foreground ${error ? 'border-destructive ring-1 ring-destructive' : ''}`}
    >
      <option value="">{required ? 'Selecione um contrato *' : 'Selecione um contrato'}</option>
      {contracts.length === 0 ? (
        <option value="" disabled>Nenhum contrato disponível</option>
      ) : (
        contracts.map((contract) => (
          <option key={contract.contractNumber} value={contract.contractNumber}>
            {contract.contractNumber} - {contract.clientName} {contract.foccoNumber ? `(FOCCO ${contract.foccoNumber})` : ''}
          </option>
        ))
      )}
    </select>
  );
}
