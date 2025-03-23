"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { HabitatSchemaConfig } from "@/components/admin/config/HabitatSchemaConfig";
import { PromptConfig } from "@/components/admin/config/PromptConfig";
import { HabitatTypesConfig } from "@/components/admin/config/HabitatTypesConfig";
import { HabitatGroupsConfig } from "@/components/admin/config/HabitatGroupsConfig";

export function ConfigurationDashboard() {
  return (
    <Tabs defaultValue="schema" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="schema">Analyse-Schema</TabsTrigger>
        <TabsTrigger value="prompts">Prompts</TabsTrigger>
        <TabsTrigger value="types">Habitat-Typen</TabsTrigger>
        <TabsTrigger value="groups">Habitat-Familien</TabsTrigger>
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
      
      <TabsContent value="groups">
        <Card className="p-6">
          <HabitatGroupsConfig />
        </Card>
      </TabsContent>
    </Tabs>
  );
} 