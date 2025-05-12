import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterX, Search, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FilterValue = string | string[] | boolean;

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface FilterGroup {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'text';
  options?: FilterOption[];
  placeholder?: string;
}

interface HabitatFilterProps {
  filterGroups: FilterGroup[];
  initialFilters?: Record<string, FilterValue>;
  onFilterChange: (filters: Record<string, FilterValue>) => void;
  onResetFilters?: () => void;
  allPersons?: string[];
}

export function HabitatFilterPanel({
  filterGroups,
  initialFilters = {},
  onFilterChange,
  onResetFilters,
  allPersons = []
}: HabitatFilterProps) {
  // Filter-Zustand initialisieren
  const [filters, setFilters] = useState<Record<string, FilterValue>>(initialFilters);
  const [activeFilters, setActiveFilters] = useState<{ key: string, value: string, label: string }[]>([]);
  
  // Aktive Filter aktualisieren, wenn sich der Filter-Zustand ändert
  useEffect(() => {
    const newActiveFilters: { key: string, value: string, label: string }[] = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      
      const filterGroup = filterGroups.find(group => group.id === key);
      if (!filterGroup) return;
      
      if (Array.isArray(value)) {
        value.forEach(v => {
          const option = filterGroup.options?.find(opt => opt.value === v);
          const label = option?.label || v;
          newActiveFilters.push({ key, value: v, label: `${filterGroup.label}: ${label}` });
        });
      } else if (typeof value === 'string') {
        const option = filterGroup.options?.find(opt => opt.value === value);
        const label = option?.label || value;
        newActiveFilters.push({ key, value: value as string, label: `${filterGroup.label}: ${label}` });
      } else if (typeof value === 'boolean' && value) {
        newActiveFilters.push({ key, value: 'true', label: filterGroup.label });
      }
    });
    
    setActiveFilters(newActiveFilters);
  }, [filters, filterGroups]);
  
  // Filter anwenden
  const handleFilterChange = (fieldId: string, value: FilterValue) => {
    const newFilters = { ...filters };
    
    if (value === undefined || (Array.isArray(value) && value.length === 0) || value === '' || value === 'alle') {
      delete newFilters[fieldId];
    } else {
      newFilters[fieldId] = value;
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  // Einzelnen Filter entfernen
  const removeFilter = (key: string, value?: string) => {
    const newFilters = { ...filters };
    
    if (value && Array.isArray(newFilters[key])) {
      // Bei Arrays einen einzelnen Wert entfernen
      newFilters[key] = (newFilters[key] as string[]).filter(v => v !== value);
      if ((newFilters[key] as string[]).length === 0) {
        delete newFilters[key];
      }
    } else {
      // Bei einfachen Werten den ganzen Filter entfernen
      delete newFilters[key];
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  // Alle Filter zurücksetzen
  const resetFilters = () => {
    setFilters({});
    onFilterChange({});
    if (onResetFilters) {
      onResetFilters();
    }
  };
  
  // Anzahl der aktiven Filter
  const activeFiltersCount = Object.keys(filters).length;
  
  // Rendering für verschiedene Filter-Typen
  const renderFilterField = (filterGroup: FilterGroup) => {
    const { id, label, type, options, placeholder } = filterGroup;
    const currentValue = filters[id];
    
    switch (type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex relative">
              <Input
                id={id}
                value={currentValue as string || ''}
                onChange={(e) => handleFilterChange(id, e.target.value)}
                placeholder={placeholder || `${label} eingeben...`}
                className="pr-8"
              />
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Select
              value={currentValue as string || ""}
              onValueChange={(value) => handleFilterChange(id, value)}
            >
              <SelectTrigger id={id}>
                <SelectValue placeholder={placeholder || `${label} auswählen...`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                {options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      case 'multiselect':
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            {options && options.length === 0 ? (
              <div className="text-sm text-gray-500">Keine Werte verfügbar</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto p-1 border rounded-md">
                {options?.map((option) => {
                  const isSelected = Array.isArray(currentValue) 
                    ? currentValue.includes(option.value)
                    : currentValue === option.value;
                    
                  return (
                    <div className="flex items-center space-x-2 py-1 px-1 hover:bg-gray-50 rounded" key={option.value}>
                      <Checkbox
                        id={`${id}-${option.value}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          let newValues = Array.isArray(currentValue) ? [...(currentValue as string[])] : [];
                          
                          if (checked) {
                            if (!newValues.includes(option.value)) {
                              newValues.push(option.value);
                            }
                          } else {
                            newValues = newValues.filter(v => v !== option.value);
                          }
                          
                          handleFilterChange(id, newValues.length > 0 ? newValues : '');
                        }}
                      />
                      <Label 
                        htmlFor={`${id}-${option.value}`}
                        className="text-sm cursor-pointer leading-tight"
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Card className="w-full max-w-xs">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Filter</CardTitle>
          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetFilters}
              className="h-8 px-2 text-xs"
            >
              <FilterX className="h-3 w-3 mr-1" />
              <span>Zurücksetzen ({activeFiltersCount})</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aktive Filter anzeigen */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer gap-1 pl-2 h-6">
                <span className="text-xs">{filter.label}</span>
                <X 
                  className="h-3 w-3 text-gray-500 hover:text-red-500"
                  onClick={() => removeFilter(filter.key, filter.value)}
                />
              </Badge>
            ))}
          </div>
        )}

        {/* Filter-Felder */}
        <div className="space-y-4">
          {filterGroups.map((filterGroup) => (
            <div key={filterGroup.id} className="pb-3 border-b border-gray-100 last:border-0">
              {renderFilterField(filterGroup)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 