import { useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LayoutGrid, 
  ChevronLeft, 
  ChevronRight,
  Trophy,
  Users,
  PenTool,
  Ruler
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useMonthlyEnvironmentStats, 
  useProjetistaRanking 
} from '@/hooks/useProjectEnvironments';
import IndicadoresProjetosTab from '@/components/projetos/IndicadoresProjetosTab';

export default function Projetos() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const { data: stats, isLoading: statsLoading } = useMonthlyEnvironmentStats(year, month);
  const { data: ranking, isLoading: rankingLoading } = useProjetistaRanking(year, month);

  const handlePreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">PROJETOS</h1>
          <p className="text-xs text-muted-foreground tracking-wide">
            Gestão e acompanhamento de produção por ambientes
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold capitalize min-w-[160px] text-center">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Main Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ambientes de Apresentação
                </CardTitle>
                <PenTool className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold">{stats?.totalApresentacao || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.actionsCount ? `${stats.actionsCount} ações registradas` : 'Ações de Projeto de Apresentação'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ambientes Técnicos
                </CardTitle>
                <Ruler className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold">{stats?.totalTecnico || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Ambientes executados via checklist
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rankings */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Ranking Consultores Atendidos */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Consultores Atendidos</CardTitle>
                </div>
                <CardDescription>Apresentações recebidas no mês</CardDescription>
              </CardHeader>
              <CardContent>
                {rankingLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : ranking?.consultants && ranking.consultants.length > 0 ? (
                  <div className="space-y-3">
                    {ranking.consultants.slice(0, 5).map((item, index) => (
                      <div key={item.consultantId} className={`flex items-center justify-between p-3 rounded-lg ${index === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {index + 1}º
                          </div>
                          <span className="font-medium text-sm">{item.consultantName}</span>
                        </div>
                        <Badge variant="secondary" className="text-base font-bold">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma apresentação registrada</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ranking Projetistas de Apresentação */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-base">Projetistas de Apresentação</CardTitle>
                </div>
                <CardDescription>Ambientes produzidos no mês</CardDescription>
              </CardHeader>
              <CardContent>
                {rankingLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : ranking?.apresentacao && ranking.apresentacao.length > 0 ? (
                  <div className="space-y-3">
                    {ranking.apresentacao.map((item, index) => (
                      <div key={item.projetistaId} className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800' :
                        index === 1 ? 'bg-slate-50 dark:bg-slate-950/30' :
                        index === 2 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/30'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-blue-500 text-white' :
                            index === 1 ? 'bg-slate-400 text-white' :
                            index === 2 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}º
                          </div>
                          <span className="font-medium text-sm">{item.projetistaName}</span>
                        </div>
                        <Badge variant="secondary" className="text-base font-bold">
                          {item.count} <span className="text-xs font-normal ml-1">amb.</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum ambiente registrado</p>
                    <p className="text-xs mt-1">Registre ações com quantidade de ambientes</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ranking Projetistas Técnicos */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-base">Projetistas Técnicos</CardTitle>
                </div>
                <CardDescription>Ambientes executados no mês</CardDescription>
              </CardHeader>
              <CardContent>
                {rankingLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : ranking?.tecnico && ranking.tecnico.length > 0 ? (
                  <div className="space-y-3">
                    {ranking.tecnico.map((item, index) => (
                      <div key={item.projetistaId} className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' :
                        index === 1 ? 'bg-slate-50 dark:bg-slate-950/30' :
                        index === 2 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/30'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-green-500 text-white' :
                            index === 1 ? 'bg-slate-400 text-white' :
                            index === 2 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}º
                          </div>
                          <span className="font-medium text-sm">{item.projetistaName}</span>
                        </div>
                        <Badge variant="secondary" className="text-base font-bold">
                          {item.count} <span className="text-xs font-normal ml-1">amb.</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum ambiente técnico registrado</p>
                    <p className="text-xs mt-1">Complete etapas do checklist</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-blue-500" />
                    Projeto de Apresentação
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                    <li>• Registrado via +Registrar Ação no Dashboard</li>
                    <li>• Vincula projetista ao consultor comercial</li>
                    <li>• Conta ambientes antes da venda</li>
                    <li>• Gera pontos no Programa E+</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-green-500" />
                    Projeto Técnico
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                    <li>• Registrado via Checklist (após venda)</li>
                    <li>• Vinculado obrigatoriamente a um contrato</li>
                    <li>• Conta ambientes executados</li>
                    <li>• Gera pontos no Programa E+</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicadores" className="mt-4">
          <IndicadoresProjetosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
