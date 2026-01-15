import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { TeamMember, ProfessionalType } from '@/types';

export interface FilterState {
  consultantId: string;
  typeId: string;
  lastActionDays: string;
  hasActions: string;
  hasProjects: string;
  searchName: string;
}

interface ProfessionalsFilterProps {
  teamMembers: TeamMember[];
  professionalTypes: ProfessionalType[];
  isAdmin: boolean;
  currentConsultantId: string | null;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export const defaultFilters: FilterState = {
  consultantId: '',
  typeId: '',
  lastActionDays: '',
  hasActions: '',
  hasProjects: '',
  searchName: '',
};

export function ProfessionalsFilter({
  teamMembers,
  professionalTypes,
  isAdmin,
  currentConsultantId,
  filters,
  onFilterChange,
}: ProfessionalsFilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const activeMembers = teamMembers.filter(m => m.active);

  // Set default consultant filter for non-admins
  useEffect(() => {
    if (!isAdmin && currentConsultantId && !filters.consultantId) {
      onFilterChange({ ...filters, consultantId: currentConsultantId });
    }
  }, [isAdmin, currentConsultantId, filters, onFilterChange]);

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    const cleared = { ...defaultFilters };
    // Keep consultant filter for non-admins
    if (!isAdmin && currentConsultantId) {
      cleared.consultantId = currentConsultantId;
    }
    onFilterChange(cleared);
  };

  const hasActiveFilters = () => {
    const baseFilters = { ...filters };
    // Don't count auto-applied consultant filter for non-admins
    if (!isAdmin && currentConsultantId && filters.consultantId === currentConsultantId) {
      baseFilters.consultantId = '';
    }
    return Object.values(baseFilters).some(v => v !== '');
  };

  return (
    <div className="space-y-3">
      {/* Search Bar + Toggle Button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={filters.searchName}
            onChange={(e) => handleChange('searchName', e.target.value)}
            className="input-flat w-full pl-10 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 justify-center ${hasActiveFilters() ? 'border-primary' : 'border-card-foreground'}`}
        >
          <Filter className="w-4 h-4" />
          <span>Filtros</span>
          {hasActiveFilters() && (
            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              !
            </span>
          )}
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="card-flat animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Consultant Filter - only for admins */}
            {isAdmin && (
              <div>
                <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                  Consultor
                </label>
                <select
                  value={filters.consultantId}
                  onChange={(e) => handleChange('consultantId', e.target.value)}
                  className="input-flat w-full text-sm"
                >
                  <option value="">Todos os consultores</option>
                  {activeMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Professional Type Filter */}
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                Tipo de Profissional
              </label>
              <select
                value={filters.typeId}
                onChange={(e) => handleChange('typeId', e.target.value)}
                className="input-flat w-full text-sm"
              >
                <option value="">Todos os tipos</option>
                {professionalTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Last Action Days Filter */}
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                Data da Última Ação
              </label>
              <select
                value={filters.lastActionDays}
                onChange={(e) => handleChange('lastActionDays', e.target.value)}
                className="input-flat w-full text-sm"
              >
                <option value="">Qualquer período</option>
                <option value="30">Últimos 30 dias</option>
                <option value="60">Últimos 60 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
            </div>

            {/* Has Actions Filter */}
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                Ações Registradas
              </label>
              <select
                value={filters.hasActions}
                onChange={(e) => handleChange('hasActions', e.target.value)}
                className="input-flat w-full text-sm"
              >
                <option value="">Todos</option>
                <option value="with">Com ações</option>
                <option value="without">Sem ações</option>
              </select>
            </div>

            {/* Has Projects Filter */}
            <div>
              <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">
                Projetos Captados
              </label>
              <select
                value={filters.hasProjects}
                onChange={(e) => handleChange('hasProjects', e.target.value)}
                className="input-flat w-full text-sm"
              >
                <option value="">Todos</option>
                <option value="with">Com projetos</option>
                <option value="without">Sem projetos</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters() && (
            <div className="mt-4 pt-4 border-t border-black/10">
              <button
                onClick={clearFilters}
                className="text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Indicator for non-admins */}
      {!isAdmin && currentConsultantId && (
        <p className="text-xs text-muted-foreground">
          Exibindo apenas profissionais vinculados a você.
        </p>
      )}
    </div>
  );
}
