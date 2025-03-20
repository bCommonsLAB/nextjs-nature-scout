"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface SchemaData {
  _id?: string;
  name: string;
  version: string;
  description: string;
  schema: Record<string, string>;
}

export function HabitatSchemaConfig() {
  const [schemaData, setSchemaData] = useState<SchemaData>({
    name: "",
    version: "",
    description: "",
    schema: {}
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadSchema = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/schema/habitat-analysis");
      if (!response.ok) throw new Error("Fehler beim Laden des Schemas");
      const data = await response.json();
      setSchemaData({
        _id: data._id,
        name: data.name || "",
        version: data.version || "",
        description: data.description || "",
        schema: data.schema || {}
      });
    } catch (error) {
      toast.error("Fehler beim Laden des Schemas");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchema();
  }, []);

  const saveSchema = async () => {
    try {
      setIsLoading(true);
      console.log('Sende Schema-Daten:', schemaData);
      const response = await fetch("/api/admin/schema/habitat-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schemaData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server Fehler:', errorData);
        throw new Error(errorData.error || "Fehler beim Speichern");
      }
      toast.success("Schema erfolgreich gespeichert");
    } catch (error) {
      toast.error("Fehler beim Speichern des Schemas");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMetadata = (field: keyof SchemaData, value: string) => {
    setSchemaData(prev => ({ ...prev, [field]: value }));
  };

  const updateSchemaField = (key: string, value: string) => {
    setSchemaData(prev => ({
      ...prev,
      schema: { ...prev.schema, [key]: value }
    }));
  };

  const addSchemaField = () => {
    setSchemaData(prev => ({
      ...prev,
      schema: { ...prev.schema, "neues_feld": "" }
    }));
  };

  const removeSchemaField = (key: string) => {
    const newSchema = { ...schemaData.schema };
    delete newSchema[key];
    setSchemaData(prev => ({ ...prev, schema: newSchema }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Habitat-Analyse Schema</h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={loadSchema} 
            disabled={isLoading}
          >
            Laden
          </Button>
          <Button 
            onClick={saveSchema} 
            disabled={isLoading}
          >
            Speichern
          </Button>
        </div>
      </div>

      {/* Metadaten */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={schemaData.name}
              onChange={(e) => updateMetadata("name", e.target.value)}
              placeholder="Schema Name"
            />
          </div>
          <div>
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={schemaData.version}
              onChange={(e) => updateMetadata("version", e.target.value)}
              placeholder="1.0.0"
            />
          </div>
          <div>
            <Label htmlFor="description">Beschreibung</Label>
            <Input
              id="description"
              value={schemaData.description}
              onChange={(e) => updateMetadata("description", e.target.value)}
              placeholder="Schema Beschreibung"
            />
          </div>
        </div>
      </Card>

      {/* Schema Felder */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Schema Felder</h3>
          <Button
            variant="outline"
            onClick={addSchemaField}
            size="sm"
          >
            Neues Feld
          </Button>
        </div>
        <div className="grid gap-4">
          {Object.entries(schemaData.schema).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-4 items-start">
              <div>
                <Input
                  value={key}
                  onChange={(e) => {
                    const newSchema = { ...schemaData.schema };
                    delete newSchema[key];
                    newSchema[e.target.value] = value;
                    setSchemaData(prev => ({ ...prev, schema: newSchema }));
                  }}
                  placeholder="Feldname"
                  className="font-mono"
                />
              </div>
              <div className="col-span-2 flex gap-2">
                <Textarea
                  value={value}
                  onChange={(e) => updateSchemaField(key, e.target.value)}
                  placeholder="Feldbeschreibung"
                  className="font-mono"
                  rows={2}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSchemaField(key)}
                  className="shrink-0"
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
} 