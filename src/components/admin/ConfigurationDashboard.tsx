"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { HabitatSchemaConfig } from "@/components/admin/config/HabitatSchemaConfig";
import { PromptConfig } from "@/components/admin/config/PromptConfig";
import { HabitatTypesConfig } from "@/components/admin/config/HabitatTypesConfig";

export function ConfigurationDashboard() {
  return (
    <Tabs defaultValue="schema" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="schema">Analyse-Schema</TabsTrigger>
        <TabsTrigger value="prompts">Prompts</TabsTrigger>
        <TabsTrigger value="types">Habitat-Typen</TabsTrigger>
      </TabsList>
      
      <TabsContent value="schema">
        <Card className="p-6">
          <HabitatSchemaConfig />
        </Card>
      </TabsContent>
      
      <TabsContent value="prompts">
        <Card className="p-6">
          <PromptConfig />
        </Card>
      </TabsContent>
      
      <TabsContent value="types">
        <Card className="p-6">
          <HabitatTypesConfig />
        </Card>
      </TabsContent>
    </Tabs>
  );
} 