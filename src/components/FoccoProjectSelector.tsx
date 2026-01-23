import { useState, useEffect } from 'react';
import { ChevronDown, Loader2, Search, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  focco_project_number: string;
  name: string;
  client_id: string | null;
  clients?: { name: string } | null;
  professionals?: { name: string } | null;
}

interface FoccoProjectSelectorProps {
  value: string;
  onChange: (foccoNumber: string, project?: Project) => void;
  professionalId?: string;
  consultantId?: string;
  hasError?: boolean;
  disabled?: boolean;
}

export function FoccoProjectSelector({
  value,
  onChange,
  professionalId,
  consultantId,
  hasError = false,
  disabled = false,
}: FoccoProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all projects in negotiation
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('projects')
          .select('id, focco_project_number, name, client_id, clients(name), professionals(name)')
          .eq('stage', 'em_negociacao')
          .not('focco_project_number', 'is', null)
          .order('created_at', { ascending: false });

        // Optionally filter by professional if provided
        if (professionalId && professionalId !== 'none') {
          // We don't filter by professional - show ALL projects in negotiation
          // The user might want to close a sale for any project
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching projects:', error);
          return;
        }

        setProjects((data as Project[]) || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [professionalId, consultantId]);

  // Filter projects based on search
  const filteredProjects = projects.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.focco_project_number?.toLowerCase().includes(term) ||
      p.name?.toLowerCase().includes(term) ||
      p.clients?.name?.toLowerCase().includes(term)
    );
  });

  // Get selected project display text
  const selectedProject = projects.find(p => p.focco_project_number === value);
  const displayText = selectedProject 
    ? `${selectedProject.focco_project_number} - ${selectedProject.clients?.name || selectedProject.name}`
    : value || 'Selecione um projeto';

  const handleSelect = (project: Project) => {
    onChange(project.focco_project_number, project);
    setIsOpen(false);
    setSearchTerm('');
  };

  if (disabled) {
    return (
      <div className={`input-flat w-full text-card-foreground opacity-50 cursor-not-allowed ${hasError ? 'border-destructive ring-1 ring-destructive' : ''}`}>
        {displayText}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`input-flat w-full text-card-foreground flex items-center justify-between gap-2 text-left ${hasError ? 'border-destructive ring-1 ring-destructive' : ''}`}
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </span>
          ) : (
            displayText
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-72 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por FOCCO, nome ou cliente..."
                className="input-flat w-full pl-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Project List */}
          <div className="max-h-56 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {projects.length === 0 
                  ? 'Nenhum projeto em negociação encontrado'
                  : 'Nenhum resultado para a busca'
                }
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project)}
                  className={`w-full px-3 py-2 text-left hover:bg-muted/50 flex items-start gap-3 border-b border-border/50 last:border-0 ${
                    value === project.focco_project_number ? 'bg-primary/10' : ''
                  }`}
                >
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">
                      FOCCO {project.focco_project_number}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {project.clients?.name || project.name}
                      {project.professionals?.name && (
                        <span> • {project.professionals.name}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Summary */}
          <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            {projects.length} projeto(s) em negociação
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsOpen(false);
            setSearchTerm('');
          }}
        />
      )}
    </div>
  );
}
