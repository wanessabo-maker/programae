import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Profissionais from './Profissionais';
import PerfilClientesTab from '@/components/comercial/PerfilClientesTab';
import ProjetosTab from '@/components/comercial/ProjetosTab';
import ContratosTab from '@/components/comercial/ContratosTab';
import IndicadoresTab from '@/components/comercial/IndicadoresTab';

export default function Comercial() {
  // Indicadores agora é a aba padrão — primeira coisa que a gestora vê
  const [activeTab, setActiveTab] = useState('indicadores');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">COMERCIAL</h1>
        <p className="text-xs text-muted-foreground tracking-wide">
          Gestão do funil comercial e relacionamento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-background border border-border">

          {/* 1 — Indicadores: primeiro porque é o que a gestora quer ver ao abrir */}
          <TabsTrigger
            value="indicadores"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Indicadores
          </TabsTrigger>

          {/* 2 — Especificadores: nome correto para o que antes era "Profissionais" */}
          <TabsTrigger
            value="especificadores"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Especificadores
          </TabsTrigger>

          {/* 3 — Carteira Flutuante: nome correto para o que antes era "Projetos" */}
          <TabsTrigger
            value="carteira"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Carteira Flutuante
          </TabsTrigger>

          {/* 4 — Contratos: mantido igual */}
          <TabsTrigger
            value="contratos"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Contratos
          </TabsTrigger>

          {/* 5 — Perfil de Clientes: substitui "Clientes" com análise real de conversão */}
          <TabsTrigger
            value="perfil"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Perfil de Clientes
          </TabsTrigger>

        </TabsList>

        <TabsContent value="indicadores" className="mt-6">
          <IndicadoresTab />
        </TabsContent>

        <TabsContent value="especificadores" className="mt-6">
          <Profissionais embedded />
        </TabsContent>

        <TabsContent value="carteira" className="mt-6">
          <ProjetosTab />
        </TabsContent>

        <TabsContent value="contratos" className="mt-6">
          <ContratosTab />
        </TabsContent>

        <TabsContent value="perfil" className="mt-6">
          <PerfilClientesTab />
        </TabsContent>

      </Tabs>
    </div>
  );
}
