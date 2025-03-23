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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

export function HabitatGroupsConfig() {
  const [groups, setGroups] = useState<HabitatGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<HabitatGroup | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

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

  const saveGroups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/habitat-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groups.map(group => ({
          id: group._id,
          name: group.name,
          description: group.description,
          imageUrl: group.imageUrl,
          pos: group.pos
        })))
      });
      
      if (!response.ok) throw new Error("Fehler beim Speichern");
      toast.success("Habitat-Familien erfolgreich gespeichert");
    } catch (error) {
      toast.error("Fehler beim Speichern der Habitat-Familien");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
      setCurrentGroup({...groups[index]});
      setCurrentIndex(index);
      setIsDetailOpen(true);
    }
  };

  const removeGroup = (index: number) => {
    if (index >= 0 && index < groups.length) {
      setGroups(groups.filter((_, i) => i !== index));
    }
  };

  const movePosition = (index: number, direction: 'up' | 'down') => {
    if (index < 0 || index >= groups.length) return;
    
    const newGroups = [...groups];
    const sortedGroups = [...newGroups].sort((a, b) => a.pos - b.pos);
    
    // Finde das Element in den sortierten Gruppen
    const sortedIndex = sortedGroups.findIndex(g => g === newGroups[index]);
    if (sortedIndex < 0) return;
    
    // Bestimme den Tausch-Index basierend auf der Richtung
    const swapIndex = direction === 'up' 
      ? Math.max(0, sortedIndex - 1) 
      : Math.min(sortedGroups.length - 1, sortedIndex + 1);
    
    // Wenn kein Tausch nötig ist (erstes/letztes Element)
    if (swapIndex === sortedIndex) return;
    
    // Tausche die Positionen
    const temp = sortedGroups[sortedIndex].pos;
    sortedGroups[sortedIndex].pos = sortedGroups[swapIndex].pos;
    sortedGroups[swapIndex].pos = temp;
    
    // Aktualisiere die Gruppen
    setGroups([...newGroups]);
  };

  const saveCurrentGroup = () => {
    if (!currentGroup) return;

    const updatedGroups = [...groups];
    if (currentIndex !== null && currentIndex >= 0 && currentIndex < groups.length) {
      // Bearbeiten eines vorhandenen Eintrags
      updatedGroups[currentIndex] = currentGroup;
    } else {
      // Hinzufügen eines neuen Eintrags
      updatedGroups.push(currentGroup);
    }
    
    setGroups(updatedGroups);
    closeDetail();
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

  // Sortiere Gruppen nach Position
  const sortedGroups = [...groups].sort((a, b) => a.pos - b.pos);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Habitat-Familien</h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={loadGroups} 
            disabled={isLoading}
          >
            Laden
          </Button>
          <Button 
            onClick={saveGroups} 
            disabled={isLoading}
          >
            Speichern
          </Button>
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
                      onClick={() => movePosition(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => movePosition(index, 'down')}
                      disabled={index === sortedGroups.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => editGroup(index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGroup(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
            <Button onClick={saveCurrentGroup}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 