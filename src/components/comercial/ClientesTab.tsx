import { useMemo } from 'react';
import { Users, XCircle, CheckCircle } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useApp } from '@/contexts/AppContext';

type DashboardKey = 'negociacao' | 'vendidos' | 'perdidos';

interface DashboardConfig {
  key: DashboardKey;
  title: string;
  Icon: typeof Users;
  accent: string; // tailwind text color class
  bg: string; // tailwind bg tint class
}

const DASHBOARDS: DashboardConfig[] = [
  { key: 'negociacao', title: 'Projetos em Negociação', Icon: Users, accent: 'text-orange-500', bg: 'bg-orange-500/5' },
  { key: 'vendidos', title: 'Projetos Vendidos', Icon: CheckCircle, accent: 'text-green-500', bg: 'bg-green-500/5' },
  { key: 'perdidos', title: 'Projetos Perdidos', Icon: XCircle, accent: 'text-red-500', bg: 'bg-red-500/5' },
];

const AGE_BUCKETS = ['18-25', '26-35', '36-45', '46-55', '56+'] as const;
type AgeBucket = typeof AGE_BUCKETS[number];

function getAgeBucket(age: number | null | undefined): AgeBucket | null {
  if (age == null) return null;
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  return '56+';
}

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function ClientesTab() {
  const { data: clients = [], isLoading } = useClients();
  const { data: projects = [] } = useProjects();
  const { actions, actionTypes } = useApp();

  // Identify "Apresentação de Projeto" action type IDs (Comercial)
  const presentationActionTypeIds = useMemo(() => {
    return new Set(
      actionTypes
        .filter(t => {
          const n = normalizeText(t.name || '');
          return n.includes('apresentacao de projeto');
        })
        .map(t => t.id)
    );
  }, [actionTypes]);

  // Map clientId -> presentation count
  const presentationsByClient = useMemo(() => {
    const map = new Map<string, number>();
    actions.forEach(a => {
      if (!a.actionTypeId || !presentationActionTypeIds.has(a.actionTypeId)) return;
      // Find client via project linkage
      const project = projects.find(p => p.id === a.projectId);
      const clientId = project?.client_id;
      if (!clientId) return;
      map.set(clientId, (map.get(clientId) || 0) + 1);
    });
    return map;
  }, [actions, presentationActionTypeIds, projects]);

  // Bucket clients by status
  const clientsByDashboard = useMemo(() => {
    const groups: Record<DashboardKey, typeof clients> = {
      negociacao: [],
      vendidos: [],
      perdidos: [],
    };
    clients.forEach(c => {
      if (c.status === 'closed') groups.vendidos.push(c);
      else if (c.status === 'lost') groups.perdidos.push(c);
      else groups.negociacao.push(c);
    });
    return groups;
  }, [clients]);

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const buildProfile = (list: typeof clients) => {
    const professions: Record<string, number> = {};
    const ages: Record<AgeBucket, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
    let presentationsTotal = 0;
    let clientsWithPresentations = 0;

    list.forEach(c => {
      if (c.profession) {
        const key = c.profession.trim();
        if (key) professions[key] = (professions[key] || 0) + 1;
      }
      const bucket = getAgeBucket(c.age);
      if (bucket) ages[bucket]++;
      const count = presentationsByClient.get(c.id) || 0;
      presentationsTotal += count;
      if (count > 0) clientsWithPresentations++;
    });

    const topProfessions = Object.entries(professions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const ageEntries = AGE_BUCKETS
      .map(b => [b, ages[b]] as const)
      .filter(([, v]) => v > 0);

    const avgPresentations = list.length > 0
      ? (presentationsTotal / list.length).toFixed(1)
      : '0.0';

    return { topProfessions, ageEntries, avgPresentations, presentationsTotal, clientsWithPresentations };
  };

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground bg-muted/50 px-4 py-3 border border-border">
        <span className="font-medium">Perfil dos clientes</span> agrupado por estágio do funil. Os dados são captados automaticamente a partir das ações de "Apresentação de Projeto" e "Venda".
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {DASHBOARDS.map(({ key, title, Icon, accent, bg }) => {
          const list = clientsByDashboard[key];
          const profile = buildProfile(list);
          const maxAge = Math.max(1, ...profile.ageEntries.map(([, v]) => v));
          const maxProf = Math.max(1, ...profile.topProfessions.map(([, v]) => v));

          return (
            <div key={key} className={`border border-border ${bg} flex flex-col`}>
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${accent}`} />
                    <span className="text-xs tracking-widest uppercase text-muted-foreground">{title}</span>
                  </div>
                  <span className="text-3xl font-light tabular-nums">{list.length}</span>
                </div>
              </div>

              {/* Profile body */}
              <div className="p-4 space-y-5 flex-1">
                {/* Profissão */}
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Profissão</div>
                  {profile.topProfessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados</p>
                  ) : (
                    <div className="space-y-1.5">
                      {profile.topProfessions.map(([name, value]) => (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="truncate pr-2">{name}</span>
                            <span className="font-medium tabular-nums">{value}</span>
                          </div>
                          <div className="h-1 bg-muted overflow-hidden">
                            <div
                              className={`h-full ${accent.replace('text-', 'bg-')}`}
                              style={{ width: `${(value / maxProf) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Faixa Etária */}
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Faixa Etária</div>
                  {profile.ageEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados</p>
                  ) : (
                    <div className="space-y-1.5">
                      {profile.ageEntries.map(([name, value]) => (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{name} anos</span>
                            <span className="font-medium tabular-nums">{value}</span>
                          </div>
                          <div className="h-1 bg-muted overflow-hidden">
                            <div
                              className={`h-full ${accent.replace('text-', 'bg-')}`}
                              style={{ width: `${(value / maxAge) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apresentações por Cliente */}
                <div className="pt-3 border-t border-border">
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Apresentações por Cliente</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Média</span>
                    <span className="text-2xl font-light tabular-nums">{profile.avgPresentations}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-sm font-medium tabular-nums">{profile.presentationsTotal}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Clientes c/ apresentação</span>
                    <span className="text-sm font-medium tabular-nums">{profile.clientsWithPresentations}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
