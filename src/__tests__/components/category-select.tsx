'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import type { GroupedTestCases } from '../types/test-types';

interface CategorySelectProps {
  categories: GroupedTestCases;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategorySelect({ 
  categories, 
  selectedCategory, 
  onCategoryChange 
}: CategorySelectProps) {
  const categoryNames = Object.keys(categories);
  const totalCount = Object.values(categories).reduce((sum, cases) => sum + cases.length, 0);

  return (
    <div className="w-[300px]">
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger>
          <SelectValue placeholder="Wähle eine Kategorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            Alle Kategorien ({totalCount} Testfälle)
          </SelectItem>
          {categoryNames.map((category) => (
            <SelectItem key={category} value={category}>
              {category} ({categories[category]!.length} Testfälle)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 