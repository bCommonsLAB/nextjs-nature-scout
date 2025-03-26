"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function PromptConfig() {
  const [promptType, setPromptType] = useState("habitat-analysis");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadPrompt = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/prompt/${promptType}`);
      if (!response.ok) throw new Error("Fehler beim Laden des Prompts");
      const data = await response.json();
      setSystemPrompt(data.systemInstruction || "");
      setAnalysisPrompt(data.analysisPrompt || "");
    } catch (error) {
      toast.error("Fehler beim Laden des Prompts");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Automatisches Laden beim Komponenten-Mount und bei Änderung des promptType
  useEffect(() => {
    loadPrompt();
  }, [promptType]);

  const savePrompt = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/prompt/${promptType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: promptType,
          version: "1.0.0",
          description: promptType === "habitat-analysis" 
            ? "Prompts für die Analyse von Habitattypen"
            : "Prompts für die Analyse des Schutzstatus",
          systemInstruction: systemPrompt,
          analysisPrompt: analysisPrompt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Speichern");
      }
      toast.success("Prompt erfolgreich gespeichert");
    } catch (error) {
      toast.error("Fehler beim Speichern des Prompts");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Prompt Konfiguration</h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={loadPrompt} 
            disabled={isLoading}
          >
            Laden
          </Button>
          <Button 
            onClick={savePrompt} 
            disabled={isLoading}
          >
            Speichern
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Prompt-Typ</Label>
          <Select 
            value={promptType} 
            onValueChange={setPromptType}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="habitat-analysis">Habitat-Analyse</SelectItem>
              <SelectItem value="schutzstatus-analysis">Schutzstatus-Analyse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="font-mono h-[200px]"
            placeholder="System Prompt hier einfügen..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="analysisPrompt">Analyse Prompt</Label>
          <Textarea
            id="analysisPrompt"
            value={analysisPrompt}
            onChange={(e) => setAnalysisPrompt(e.target.value)}
            className="font-mono h-[200px]"
            placeholder="Analyse Prompt hier einfügen..."
          />
        </div>
      </div>
    </div>
  );
} 