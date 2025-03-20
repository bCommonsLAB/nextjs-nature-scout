"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface HabitatType {
  _id?: string;
  name: string;
  description: string;
  typicalSpecies: string[];
}

export function HabitatTypesConfig() {
  const [types, setTypes] = useState<HabitatType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    index: number;
    field: keyof HabitatType;
  } | null>(null);

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
          typicalSpecies: type.typicalSpecies
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
    setTypes([...types, { 
      name: "", 
      description: "",
      typicalSpecies: []
    }]);
  };

  const removeType = (index: number) => {
    setTypes(types.filter((_, i) => i !== index));
  };

  const updateType = (index: number, field: keyof HabitatType, value: any) => {
    setTypes(types.map((type, i) => 
      i === index ? { ...type, [field]: value } : type
    ));
  };

  const startEditing = (index: number, field: keyof HabitatType) => {
    setEditingCell({ index, field });
  };

  const stopEditing = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: keyof HabitatType) => {
    console.log('KeyDown Event:', {
      key: e.key,
      shiftKey: e.shiftKey,
      field: field,
      index: index
    });

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Verhindern des Standard-Verhaltens
        e.preventDefault();
        
        // Manuell neue Zeile einfügen
        const textarea = e.target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        
        const newValue = value.substring(0, start) + '\n' + value.substring(end);
        console.log('Füge neue Zeile ein:', {
          vorher: value,
          nachher: newValue,
          cursorPosition: start
        });
        
        // Update durchführen - KEINE Filterung von leeren Zeilen während der Bearbeitung
        if (field === 'typicalSpecies') {
          updateType(index, field, newValue.split('\n'));
        } else {
          updateType(index, field, newValue);
        }
        
        // Cursor-Position aktualisieren
        setTimeout(() => {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = start + 1;
        }, 0);
      } else {
        console.log('Beende Bearbeitung');
        e.preventDefault();
        
        // Beim Beenden der Bearbeitung leere Zeilen filtern
        if (field === 'typicalSpecies') {
          const textarea = e.target as HTMLTextAreaElement;
          const filteredValue = textarea.value.split('\n').filter(s => s.trim());
          updateType(index, field, filteredValue);
        }
        
        stopEditing();
      }
    }
  };

  const renderCell = (type: HabitatType, index: number, field: keyof HabitatType) => {
    const isEditing = editingCell?.index === index && editingCell?.field === field;
    const value = field === 'typicalSpecies' ? type[field].join('\n') : type[field];

    if (isEditing) {
      return (
        <div className="min-w-[200px]">
          <textarea
            autoFocus
            className="w-full p-2 border rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
            value={value}
            onChange={(e) => {
              const newValue = field === 'typicalSpecies' 
                ? e.target.value.split('\n')
                : e.target.value;
              updateType(index, field, newValue);
            }}
            onBlur={() => {
              // Beim Verlassen des Textfelds leere Zeilen filtern
              if (field === 'typicalSpecies') {
                const filteredValue = type[field].filter(s => s.trim());
                updateType(index, field, filteredValue);
              }
              stopEditing();
            }}
            onKeyDown={(e) => handleKeyDown(e, index, field)}
            placeholder={field === 'typicalSpecies' ? "Shift+Enter für neue Zeile\nEine Art pro Zeile..." : "Shift+Enter für neue Zeile..."}
          />
        </div>
      );
    }

    return (
      <div 
        className="min-h-[2.5rem] p-2 cursor-pointer hover:bg-gray-50 rounded whitespace-pre-line"
        onClick={() => startEditing(index, field)}
      >
        {field === 'typicalSpecies' 
          ? type[field].map((species, i) => (
              <div key={i} className="py-0.5">{species}</div>
            ))
          : type[field] || <span className="text-gray-400">Klicken zum Bearbeiten...</span>}
      </div>
    );
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
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead className="w-[300px]">Beschreibung</TableHead>
              <TableHead>Typische Pflanzenarten</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type, index) => (
              <TableRow key={index}>
                <TableCell className="align-top py-4">{renderCell(type, index, 'name')}</TableCell>
                <TableCell className="align-top py-4">{renderCell(type, index, 'description')}</TableCell>
                <TableCell className="align-top py-4">{renderCell(type, index, 'typicalSpecies')}</TableCell>
                <TableCell className="align-top py-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeType(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 