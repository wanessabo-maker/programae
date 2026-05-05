import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Profissionais from './Profissionais';
import PerfilClientesTab from '@/components/comercial/PerfilClientesTab';
import ProjetosTab from '@/components/comercial/ProjetosTab';
import ContratosTab from '@/components/comercial/ContratosTab';

export default function Comercial() {
  // Especificadores é a aba padrão — Indicadores foi movido para Minha Área > Gestora
  const [activeTab, setActiveTab] = useState('especificadores');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">COMERCIAL</h1>
        <p className="text-xs text-muted-foreground tracking-wide">
          Gestão do funil comercial e relacionamento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-background border border-border">

          {/* 1 — Especificadores */}
          <TabsTrigger
            value="especificadores"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Especificadores
          </TabsTrigger>

          {/* 2 — Carteira Flutuante */}
          <TabsTrigger
            value="carteira"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Carteira Flutuante
          </TabsTrigger>

          {/* 3 — Contratos */}
          <TabsTrigger
            value="contratos"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Contratos
          </TabsTrigger>

          {/* 4 — Perfil de Clientes */}
          <TabsTrigger
            value="perfil"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Perfil de Clientes
          </TabsTrigger>

        </TabsList>

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
