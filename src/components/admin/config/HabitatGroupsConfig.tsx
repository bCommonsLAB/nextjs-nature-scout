"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus, Edit, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface HabitatGroup {
  _id?: string;
  name: string;
  description: string;
  imageUrl: string;
  pos: number;
}

interface DeleteConfirmation {
  isOpen: boolean;
  groupIndex: number | null;
}

export function HabitatGroupsConfig() {
  const [groups, setGroups] = useState<HabitatGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<HabitatGroup | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    groupIndex: null
  });

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/habitat-groups");
      if (!response.ok) throw new Error("Fehler beim Laden der Habitat-Familien");
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      toast.error("Fehler beim Laden der Habitat-Familien");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const addGroup = () => {
    // Position ermitteln (höchste Position + 1)
    const maxPos = groups.length > 0 
      ? Math.max(...groups.map(g => g.pos)) 
      : 0;
    
    const newGroup: HabitatGroup = { 
      name: "", 
      description: "",
      imageUrl: "",
      pos: maxPos + 1
    };
    setCurrentGroup(newGroup);
    setCurrentIndex(null);
    setIsDetailOpen(true);
  };

  const editGroup = (index: number) => {
    if (index >= 0 && index < groups.length) {
      const group = groups[index];
      if (!group) return; // Zusätzliche Sicherheitsprüfung
      
      const safeGroup: HabitatGroup = {
        _id: group._id,
        name: group.name || "",
        description: group.description || "",
        imageUrl: group.imageUrl || "",
        pos: group.pos
      };
      
      setCurrentGroup(safeGroup);
      setCurrentIndex(index);
      setIsDetailOpen(true);
    }
  };

  // Löschdialog öffnen
  const confirmRemoveGroup = (index: number) => {
    setDeleteConfirmation({
      isOpen: true,
      groupIndex: index
    });
  };

  const removeGroup = async (index: number) => {
    if (index < 0 || index >= sortedGroups.length) return;
    
    try {
      setIsLoading(true);
      
      // Identifizieren des zu löschenden Elements
      const groupToRemove = sortedGroups[index];
      if (!groupToRemove || !groupToRemove._id) {
        throw new Error("Element konnte nicht identifiziert werden");
      }
      
      // Explizit nur ID-Liste übertragen, um zu signalisieren was gelöscht wurde
      const response = await fetch("/api/admin/habitat-groups/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: groupToRemove._id
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API-Antwort:", errorText);
        throw new Error(`Fehler beim Löschen: ${response.status}`);
      }
      
      // Nach Erfolg lokalen State aktualisieren
      const updatedGroups = groups.filter((g) => g._id !== groupToRemove._id);
      setGroups(updatedGroups);
      toast.success("Habitat-Familie erfolgreich gelöscht");
    } catch (error) {
      toast.error(`Fehler: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Fehler beim Löschen:", error);
      loadGroups();
    } finally {
      setIsLoading(false);
      setDeleteConfirmation({ isOpen: false, groupIndex: null });
    }
  };

  const movePosition = async (index: number, direction: 'up' | 'down') => {
    if (index < 0 || index >= groups.length) return;
    
    // Wir arbeiten direkt mit dem sortierten Array
    const sortedGroups = [...groups].sort((a, b) => a.pos - b.pos);
    
    // Wir müssen das Element anhand seiner ID/Eigenschaften finden, nicht per Referenz
    // Wir finden den Index im sortierten Array, der dem Element an Position 'index' im UI entspricht
    const currentItem = sortedGroups[index];
    if (!currentItem) return;
    
    // Bestimme den Tausch-Index basierend auf der Richtung
    const swapIndex = direction === 'up' 
      ? Math.max(0, index - 1) 
      : Math.min(sortedGroups.length - 1, index + 1);
    
    // Wenn kein Tausch nötig ist (erstes/letztes Element)
    if (swapIndex === index) return;
    
    const targetItem = sortedGroups[swapIndex];
    if (!targetItem) return;
    
    // Tausche die Positionen
    const temp = currentItem.pos;
    currentItem.pos = targetItem.pos;
    targetItem.pos = temp;
    
    // Aktualisiere lokalen State
    setGroups([...sortedGroups]);
    
    try {
      setIsLoading(true);
      
      // In der Datenbank speichern
      const response = await fetch("/api/admin/habitat-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sortedGroups.map(group => ({
          id: group._id,
          name: group.name,
          description: group.description,
          imageUrl: group.imageUrl,
          pos: group.pos
        })))
      });
      
      if (!response.ok) throw new Error("Fehler beim Speichern");
      toast.success("Positionen aktualisiert");
    } catch (error) {
      toast.error("Fehler beim Aktualisieren der Positionen");
      console.error(error);
      loadGroups();
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentGroup = async () => {
    if (!currentGroup) return;

    try {
      setIsLoading(true);
      
      const updatedGroups = [...groups];
      if (currentIndex !== null && currentIndex >= 0 && currentIndex < groups.length) {
        // Bearbeiten eines vorhandenen Eintrags
        updatedGroups[currentIndex] = currentGroup;
      } else {
        // Hinzufügen eines neuen Eintrags
        updatedGroups.push(currentGroup);
      }
      
      // Aktualisiere lokalen State
      setGroups(updatedGroups);
      
      // Sofortige Speicherung in der Datenbank
      const response = await fetch("/api/admin/habitat-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedGroups.map(group => ({
          id: group._id,
          name: group.name,
          description: group.description,
          imageUrl: group.imageUrl,
          pos: group.pos
        })))
      });
      
      if (!response.ok) throw new Error("Fehler beim Speichern");
      toast.success("Habitat-Familie erfolgreich gespeichert");
      
      // Dialog schließen
      closeDetail();
    } catch (error) {
      toast.error("Fehler beim Speichern der Habitat-Familie");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setCurrentGroup(null);
    setCurrentIndex(null);
  };

  const updateCurrentGroup = (field: keyof HabitatGroup, value: string | number) => {
    if (!currentGroup) return;
    setCurrentGroup({...currentGroup, [field]: value});
  };

  // Schließen des Lösch-Bestätigungsdialogs
  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      groupIndex: null
    });
  };

  // Sortiere Gruppen nach Position
  const sortedGroups = [...groups].sort((a, b) => a.pos - b.pos);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Habitat-Familien</h2>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={addGroup}
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
              <TableHead className="w-[50px]">Pos</TableHead>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead className="w-[250px]">Bild URL</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="w-[150px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGroups.map((group, index) => (
              <TableRow key={`group-${index}`}>
                <TableCell>{group.pos}</TableCell>
                <TableCell>{group.name || <span className="text-gray-400">Kein Name</span>}</TableCell>
                <TableCell className="truncate">
                  {group.imageUrl ? (
                    <a 
                      href={group.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline truncate block"
                    >
                      {group.imageUrl}
                    </a>
                  ) : (
                    <span className="text-gray-400">Kein Bild</span>
                  )}
                </TableCell>
                <TableCell className="truncate max-w-md">
                  {group.description || <span className="text-gray-400">Keine Beschreibung</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => editGroup(index)}
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmRemoveGroup(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sortedGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  Keine Habitat-Familien gefunden
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
              {currentIndex !== null ? "Habitat-Familie bearbeiten" : "Neue Habitat-Familie erstellen"}
            </DialogTitle>
          </DialogHeader>
          
          {currentGroup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name"
                    value={currentGroup.name}
                    onChange={(e) => updateCurrentGroup('name', e.target.value)}
                    placeholder="Name der Habitat-Familie"
                  />
                </div>
                
                <div>
                  <Label htmlFor="pos">Position</Label>
                  <Input 
                    id="pos"
                    type="number"
                    min="1"
                    value={currentGroup.pos}
                    onChange={(e) => updateCurrentGroup('pos', parseInt(e.target.value) || 1)}
                    placeholder="Reihenfolge (niedrigere Zahl = höhere Position)"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="imageUrl">Bild URL</Label>
                <Input 
                  id="imageUrl"
                  value={currentGroup.imageUrl}
                  onChange={(e) => updateCurrentGroup('imageUrl', e.target.value)}
                  placeholder="URL zum Bild (z.B. /images/habitat/wald.jpg)"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea 
                  id="description"
                  value={currentGroup.description}
                  onChange={(e) => updateCurrentGroup('description', e.target.value)}
                  placeholder="Beschreibung der Habitat-Familie"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDetail}>Abbrechen</Button>
            <Button onClick={saveCurrentGroup} disabled={isLoading}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löschbestätigungs-Dialog */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={closeDeleteConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Habitat-Familie löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie diese Habitat-Familie wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDeleteConfirmation}>
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteConfirmation.groupIndex !== null) {
                  removeGroup(deleteConfirmation.groupIndex);
                }
              }}
              disabled={isLoading}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 