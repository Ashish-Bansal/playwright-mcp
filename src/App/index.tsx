import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Context from './context';
import Execute from './execute';

const App: React.FC = () => {
  return (
    <div className="fixed top-0 right-0 w-full h-screen bg-gray-100 border-l border-zinc-200 z-[999999] flex flex-col overflow-hidden">
      <div className="p-4 bg-white border-b border-zinc-200 flex items-center justify-center">
        <h3 className="m-0 text-base font-medium text-gray-900">
          Playwright MCP
        </h3>
      </div>

      <Tabs defaultValue="context" className="flex-1 flex flex-col">
        <div className="p-4 bg-white border-b border-zinc-200">
          <TabsList>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="execute">Execute</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="context" className="flex-1">
          <Context />
        </TabsContent>

        <TabsContent value="execute" className="flex-1">
          <Execute />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default App;
