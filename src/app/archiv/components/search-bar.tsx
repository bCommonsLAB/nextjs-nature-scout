'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (term: string) => void;
  value?: string;
}

export function SearchBar({ onSearch, value = '' }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  
  // Update searchTerm wenn sich value ändert (z.B. bei Zurücksetzen der Suche)
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="search"
          className="block w-full p-4 pl-10 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary focus:border-primary"
          placeholder="Suche nach Personen, Gemeinde, Flurnamen oder Habitattyp..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          type="submit"
          className="absolute right-2.5 bottom-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg text-sm px-4 py-2 transition-colors"
        >
          Suchen
        </button>
      </div>
    </form>
  );
} 