import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Profissionais from './Profissionais';
import ClientesTab from '@/components/comercial/ClientesTab';
import ProjetosTab from '@/components/comercial/ProjetosTab';
import ContratosTab from '@/components/comercial/ContratosTab';

export default function Comercial() {
  const [activeTab, setActiveTab] = useState('profissionais');

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
          <TabsTrigger 
            value="profissionais" 
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Profissionais
          </TabsTrigger>
          <TabsTrigger 
            value="clientes"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Clientes
          </TabsTrigger>
          <TabsTrigger 
            value="projetos"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Projetos
          </TabsTrigger>
          <TabsTrigger 
            value="contratos"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Contratos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profissionais" className="mt-6">
          <Profissionais embedded />
        </TabsContent>

        <TabsContent value="clientes" className="mt-6">
          <ClientesTab />
        </TabsContent>

        <TabsContent value="projetos" className="mt-6">
          <ProjetosTab />
        </TabsContent>

        <TabsContent value="contratos" className="mt-6">
          <ContratosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
