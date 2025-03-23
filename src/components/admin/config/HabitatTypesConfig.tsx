"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface HabitatType {
  _id?: string;
  name: string;
  description: string;
  typicalSpecies: string[];
  habitatFamilie: string;
  schutzstatus: string;
}

export function HabitatTypesConfig() {
  const [types, setTypes] = useState<HabitatType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentType, setCurrentType] = useState<HabitatType | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  // Gruppierte Daten für die Tabelle
  const groupedTypes = types.reduce<Record<string, HabitatType[]>>((acc, type) => {
    const familyName = type.habitatFamilie.trim() || "Nicht kategorisiert";
    if (!acc[familyName]) {
      acc[familyName] = [];
    }
    acc[familyName].push(type);
    return acc;
  }, {});

  const loadTypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/habitat-types");
      if (!response.ok) throw new Error("Fehler beim Laden der Habitat-Typen");
      const data = await response.json();
      setTypes(data);
    } catch (error) {
      toast.error("Fehler beim Laden der Habitat-Typen");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const saveTypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/habitat-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(types.map(type => ({
          id: type._id,
          name: type.name,
          description: type.description,
          typicalSpecies: type.typicalSpecies,
          habitatFamilie: type.habitatFamilie,
          schutzstatus: type.schutzstatus
        })))
      });
      
      if (!response.ok) throw new Error("Fehler beim Speichern");
      toast.success("Habitat-Typen erfolgreich gespeichert");
    } catch (error) {
      toast.error("Fehler beim Speichern der Habitat-Typen");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const addType = () => {
    const newType: HabitatType = { 
      name: "", 
      description: "",
      typicalSpecies: [],
      habitatFamilie: "",
      schutzstatus: ""
    };
    setCurrentType(newType);
    setCurrentIndex(null);
    setIsDetailOpen(true);
  };

  const editType = (type: HabitatType, index: number) => {
    setCurrentType({...type});
    setCurrentIndex(index);
    setIsDetailOpen(true);
  };

  const removeType = (index: number) => {
    setTypes(types.filter((_, i) => i !== index));
  };

  const saveCurrentType = () => {
    if (!currentType) return;

    if (currentIndex !== null) {
      // Bearbeiten eines vorhandenen Eintrags
      setTypes(types.map((type, i) => 
        i === currentIndex ? currentType : type
      ));
    } else {
      // Hinzufügen eines neuen Eintrags
      setTypes([...types, currentType]);
    }
    
    closeDetail();
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setCurrentType(null);
    setCurrentIndex(null);
  };

  const updateCurrentType = (field: keyof HabitatType, value: string | string[]) => {
    if (!currentType) return;
    setCurrentType({...currentType, [field]: value});
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Habitat-Typen</h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={loadTypes} 
            disabled={isLoading}
          >
            Laden
          </Button>
          <Button 
            onClick={saveTypes} 
            disabled={isLoading}
          >
            Speichern
          </Button>
          <Button
            variant="outline"
            onClick={addType}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Neu
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead className="w-[150px]">Schutzstatus</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="w-[100px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedTypes).map(([family, familyTypes]) => (
              <>
                <TableRow key={`family-${family}`} className="bg-muted/50">
                  <TableCell colSpan={4} className="font-medium py-2">
                    {family}
                  </TableCell>
                </TableRow>
                {familyTypes.map((type) => {
                  const globalIndex = types.findIndex(t => t === type);
                  return (
                    <TableRow key={`type-${globalIndex}`}>
                      <TableCell>{type.name || <span className="text-gray-400">Kein Name</span>}</TableCell>
                      <TableCell>{type.schutzstatus || <span className="text-gray-400">-</span>}</TableCell>
                      <TableCell className="truncate max-w-md">
                        {type.description || <span className="text-gray-400">Keine Beschreibung</span>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editType(type, globalIndex)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeType(globalIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail-Dialog zum Bearbeiten/Hinzufügen */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {currentIndex !== null ? "Habitat-Typ bearbeiten" : "Neuen Habitat-Typ erstellen"}
            </DialogTitle>
          </DialogHeader>
          
          {currentType && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="habitatFamilie">Habitat-Familie</Label>
                  <Input 
                    id="habitatFamilie"
                    value={currentType.habitatFamilie}
                    onChange={(e) => updateCurrentType('habitatFamilie', e.target.value)}
                    placeholder="z.B. Wald, Gewässer, Wiese..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name"
                    value={currentType.name}
                    onChange={(e) => updateCurrentType('name', e.target.value)}
                    placeholder="Name des Habitat-Typs"
                  />
                </div>
                
                <div>
                  <Label htmlFor="schutzstatus">Schutzstatus</Label>
                  <Input 
                    id="schutzstatus"
                    value={currentType.schutzstatus}
                    onChange={(e) => updateCurrentType('schutzstatus', e.target.value)}
                    placeholder="z.B. FFH, geschützt nach §30..."
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea 
                    id="description"
                    value={currentType.description}
                    onChange={(e) => updateCurrentType('description', e.target.value)}
                    placeholder="Beschreibung des Habitat-Typs"
                    className="min-h-[100px]"
                  />
                </div>
                
                <div>
                  <Label htmlFor="typicalSpecies">Typische Pflanzenarten</Label>
                  <Textarea 
                    id="typicalSpecies"
                    value={currentType.typicalSpecies.join("\n")}
                    onChange={(e) => updateCurrentType('typicalSpecies', e.target.value.split("\n").filter(s => s.trim()))}
                    placeholder="Eine Art pro Zeile"
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDetail}>Abbrechen</Button>
            <Button onClick={saveCurrentType}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 