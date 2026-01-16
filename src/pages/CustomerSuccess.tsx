import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CSTab = () => (
  <div className="py-8">
    <div className="border border-border p-8 text-center">
      <p className="text-xs tracking-widest uppercase text-muted-foreground">
        Customer Success - Em desenvolvimento
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Acompanhamento pós-venda vinculado a contratos fechados
      </p>
    </div>
  </div>
);

const AssistenciaTecnicaTab = () => (
  <div className="py-8">
    <div className="border border-border p-8 text-center">
      <p className="text-xs tracking-widest uppercase text-muted-foreground">
        Assistência Técnica - Em desenvolvimento
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Gestão de chamados técnicos e suporte
      </p>
    </div>
  </div>
);

export default function CustomerSuccess() {
  const [activeTab, setActiveTab] = useState('cs');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">CUSTOMER SUCCESS & AT</h1>
        <p className="text-xs text-muted-foreground tracking-wide">
          Pós-venda, relacionamento e suporte técnico
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-background border border-border">
          <TabsTrigger 
            value="cs" 
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Customer Success
          </TabsTrigger>
          <TabsTrigger 
            value="at"
            className="text-xs tracking-widest uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Assistência Técnica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cs" className="mt-6">
          <CSTab />
        </TabsContent>

        <TabsContent value="at" className="mt-6">
          <AssistenciaTecnicaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
