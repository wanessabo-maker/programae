import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useUniqueProfessions } from '@/hooks/useProfessions';
import { cn } from '@/lib/utils';

interface ProfessionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
}

export function ProfessionAutocomplete({
  value,
  onChange,
  placeholder = 'Digite ou selecione',
  required = false,
  hasError = false,
}: ProfessionAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { data: professions = [], isLoading } = useUniqueProfessions();
  
  // Sync inputValue with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // Filter professions based on input
  const filteredProfessions = professions.filter(p =>
    p.toLowerCase().includes(inputValue.toLowerCase())
  );
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        // Save the current input value when closing
        if (inputValue !== value) {
          onChange(inputValue);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, onChange]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setOpen(true);
  };
  
  const handleInputFocus = () => {
    setOpen(true);
  };
  
  const handleSelectProfession = (profession: string) => {
    setInputValue(profession);
    onChange(profession);
    setOpen(false);
    inputRef.current?.focus();
  };
  
  const handleInputBlur = () => {
    // Small delay to allow click on dropdown item
    setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, 150);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && open && filteredProfessions.length > 0) {
      e.preventDefault();
      // Select first matching profession
      const exactMatch = filteredProfessions.find(
        p => p.toLowerCase() === inputValue.toLowerCase()
      );
      if (exactMatch) {
        handleSelectProfession(exactMatch);
      } else if (filteredProfessions.length === 1) {
        handleSelectProfession(filteredProfessions[0]);
      }
    }
  };
  
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'input-flat w-full text-card-foreground pr-8',
            hasError && 'border-destructive ring-1 ring-destructive'
          )}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </button>
      </div>
      
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="py-2 px-3 text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : filteredProfessions.length === 0 ? (
            <div className="py-2 px-3 text-sm text-muted-foreground">
              {inputValue ? (
                <span>
                  Nenhuma profissão encontrada. 
                  <span className="text-primary"> "{inputValue}"</span> será criada.
                </span>
              ) : (
                'Digite para buscar ou criar'
              )}
            </div>
          ) : (
            <ul className="py-1">
              {filteredProfessions.map((profession) => (
                <li
                  key={profession}
                  onClick={() => handleSelectProfession(profession)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer',
                    'hover:bg-accent hover:text-accent-foreground',
                    profession.toLowerCase() === inputValue.toLowerCase() && 'bg-accent/50'
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      profession.toLowerCase() === inputValue.toLowerCase()
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {profession}
                </li>
              ))}
            </ul>
          )}
          
          {/* Show hint about existing similar professions */}
          {inputValue && filteredProfessions.length > 0 && !filteredProfessions.some(
            p => p.toLowerCase() === inputValue.toLowerCase()
          ) && (
            <div className="border-t border-border py-2 px-3 text-xs text-muted-foreground bg-muted/30">
              💡 Selecione uma opção existente ou pressione Enter para usar "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
