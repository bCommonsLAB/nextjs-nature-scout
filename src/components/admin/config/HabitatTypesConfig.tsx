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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HabitatType {
  _id?: string;
  name: string;
  description: string;
  typicalSpecies: string[];
  habitatFamilie: string;
  schutzstatus: string;
}

interface HabitatGroup {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  pos: number;
}

// Schutzstatus mit Farbcodierung
const getStatusBadgeClass = (status: string) => {
  switch(status) {
    case "gesetzlich geschützt":
      return "bg-red-500 text-white";
    case "ökologisch hochwertig":
      return "bg-amber-400 text-black";
    case "ökologisch niederwertig":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-200 text-gray-700";
  }
};

export function HabitatTypesConfig() {
  const [types, setTypes] = useState<HabitatType[]>([]);
  const [habitatGroups, setHabitatGroups] = useState<HabitatGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentType, setCurrentType] = useState<HabitatType | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string>("all");

  // Liste aller verfügbaren Habitat-Familien (jetzt aus der Datenbank)
  const availableFamilies = ["all", ...Array.from(new Set(types.map(type => 
    type.habitatFamilie?.trim() || "Nicht kategorisiert"
  )))];

  // Filtern der Typen basierend auf der ausgewählten Familie
  const filteredTypes = selectedFamily === "all" 
    ? types 
    : types.filter(type => 
        (type.habitatFamilie?.trim() || "Nicht kategorisiert") === selectedFamily
      );

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

  const loadHabitatGroups = async () => {
    try {
      const response = await fetch("/api/admin/habitat-groups");
      if (!response.ok) throw new Error("Fehler beim Laden der Habitat-Gruppen");
      const data = await response.json();
      setHabitatGroups(data);
    } catch (error) {
      toast.error("Fehler beim Laden der Habitat-Gruppen");
      console.error(error);
    }
  };

  useEffect(() => {
    loadTypes();
    loadHabitatGroups();
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

  const removeType = async (index: number) => {
    const typeToRemove = types[index];
    if (!typeToRemove || !typeToRemove._id) {
      toast.error("Habitat-Typ kann nicht gelöscht werden: Keine ID gefunden");
      return;
    }

    try {
      setIsLoading(true);
      
      // Lösche in der Datenbank
      const response = await fetch("/api/admin/habitat-types/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: typeToRemove._id })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fehler beim Löschen: ${response.status} ${errorText}`);
      }
      
      // Nach erfolgreicher Löschung lokalen State aktualisieren
      setTypes(types.filter((_, i) => i !== index));
      toast.success("Habitat-Typ erfolgreich gelöscht");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Fehler beim Löschen des Habitat-Typs: ${errorMessage}`);
      console.error("Löschfehler:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentType = async () => {
    if (!currentType) return;

    try {
      setIsLoading(true);
      
      let updatedTypes;
      if (currentIndex !== null) {
        // Bearbeiten eines vorhandenen Eintrags
        updatedTypes = types.map((type, i) => 
          i === currentIndex ? currentType : type
        );
      } else {
        // Hinzufügen eines neuen Eintrags
        updatedTypes = [...types, currentType];
      }
      
      // Aktualisiere lokalen State
      setTypes(updatedTypes);
      
      // Sofortige Speicherung in der Datenbank
      const response = await fetch("/api/admin/habitat-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTypes.map(type => ({
          id: type._id,
          name: type.name,
          description: type.description,
          typicalSpecies: type.typicalSpecies,
          habitatFamilie: type.habitatFamilie,
          schutzstatus: type.schutzstatus
        })))
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fehler beim Speichern (${response.status}): ${errorText}`);
      }
      
      toast.success("Habitat-Typ erfolgreich gespeichert");
      
      // Dialog schließen
      closeDetail();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Fehler beim Speichern des Habitat-Typs: ${errorMessage}`);
      console.error("Speicherfehler:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setCurrentType(null);
    setCurrentIndex(null);
  };

  const updateCurrentType = (field: keyof HabitatType, value: string | string[]) => {
    if (!currentType) return;
    
    // Spezialbehandlung für Schutzstatus
    if (field === 'schutzstatus' && value === 'none') {
      setCurrentType({...currentType, [field]: ''});
    } else {
      setCurrentType({...currentType, [field]: value});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Habitat-Typen</h2>
          <Select value={selectedFamily} onValueChange={setSelectedFamily}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Alle Familien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Familien</SelectItem>
              {availableFamilies
                .filter(family => family !== "all")
                .map(family => (
                  <SelectItem key={family} value={family}>
                    {family}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
        <div className="space-x-2">
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
              <TableHead className="w-[150px]">Name</TableHead>
              <TableHead className="w-[150px]">Habitat-Familie</TableHead>
              <TableHead className="w-[160px]">Schutzstatus</TableHead>
              <TableHead className="w-[200px]">Beschreibung</TableHead>
              <TableHead>Typische Arten</TableHead>
              <TableHead className="w-[100px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTypes.map((type, index) => {
              const globalIndex = types.findIndex(t => t === type);
              return (
                <TableRow key={`type-${globalIndex}`}>
                  <TableCell>{type.name || <span className="text-gray-400">Kein Name</span>}</TableCell>
                  <TableCell>{type.habitatFamilie || <span className="text-gray-400">Keine Familie</span>}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {type.schutzstatus ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(type.schutzstatus)}`}>
                        {type.schutzstatus}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-pre-line py-3">
                    {type.description || <span className="text-gray-400">Keine Beschreibung</span>}
                  </TableCell>
                  <TableCell className="max-w-[200px] whitespace-pre-line py-3">
                    {type.typicalSpecies && type.typicalSpecies.length > 0 
                      ? type.typicalSpecies.slice(0, 3).join(", ") + (type.typicalSpecies.length > 3 ? " ..." : "")
                      : <span className="text-gray-400">Keine Arten definiert</span>}
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
            {filteredTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  Keine Habitat-Typen gefunden
                </TableCell>
              </TableRow>
            )}
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
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Linke Spalte: Name und Beschreibung */}
                <div className="space-y-4">
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
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea 
                      id="description"
                      value={currentType.description}
                      onChange={(e) => updateCurrentType('description', e.target.value)}
                      placeholder="Beschreibung des Habitat-Typs"
                      className="min-h-[140px]"
                    />
                  </div>
                </div>
                
                {/* Rechte Spalte: Familie und Schutzstatus */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="habitatFamilie">Habitat-Familie</Label>
                    <Select 
                      value={currentType.habitatFamilie || ""} 
                      onValueChange={(value) => updateCurrentType('habitatFamilie', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Habitat-Familie auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {habitatGroups.sort((a, b) => a.pos - b.pos).map((group) => (
                          <SelectItem key={group._id} value={group.name}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="schutzstatus">Schutzstatus</Label>
                    <Select 
                      value={currentType.schutzstatus || "none"} 
                      onValueChange={(value) => updateCurrentType('schutzstatus', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Schutzstatus auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Kein Schutzstatus</SelectItem>
                        <SelectItem value="gesetzlich geschützt">Gesetzlich geschützt</SelectItem>
                        <SelectItem value="ökologisch hochwertig">Ökologisch hochwertig</SelectItem>
                        <SelectItem value="ökologisch niederwertig">Ökologisch niederwertig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Über die volle Breite: Typische Arten */}
              <div>
                <Label htmlFor="typicalSpecies">Typische Pflanzenarten</Label>
                <Textarea 
                  id="typicalSpecies"
                  value={currentType.typicalSpecies.join("\n")}
                  onChange={(e) => updateCurrentType('typicalSpecies', e.target.value.split("\n").filter(s => s.trim()))}
                  placeholder="Eine Art pro Zeile"
                  className="min-h-[150px] w-full"
                />
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