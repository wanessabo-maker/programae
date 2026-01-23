import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CSTab } from '@/components/customer-success/CSTab';
import { ATTab } from '@/components/customer-success/ATTab';

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
          <ATTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
