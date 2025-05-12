"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { HabitatCard } from '@/components/landing/HabitatCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Search, FilterX } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MultiSelectFilter } from './components/MultiSelectFilter';
import { Badge } from '@/components/ui/badge';

interface HabitatEntry {
  jobId: string;
  metadata: {
    erfassungsperson?: string;
    gemeinde?: string;
    flurname?: string;
    bilder?: Array<{url: string}>;
    organizationName?: string;
    organizationLogo?: string;
    [key: string]: unknown;
  };
  result?: {
    habitattyp?: string;
    schutzstatus?: string;
    habitatfamilie?: string;
  };
}

interface HabitatPageProps {
  entries: HabitatEntry[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
}

function UnsereHabitateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<HabitatPageProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  
  const page = Number(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const search = searchParams.get('search') || '';
  const verifizierungsstatus = searchParams.get('verifizierungsstatus') || 'alle';

  // Filterarrays aus URL-Parametern extrahieren
  const gemeindeParam = searchParams.get('gemeinde') || '';
  const habitatParam = searchParams.get('habitat') || '';
  const habitatfamilieParam = searchParams.get('habitatfamilie') || '';
  const schutzstatusParam = searchParams.get('schutzstatus') || '';
  const personParam = searchParams.get('person') || '';
  const organizationParam = searchParams.get('organization') || '';
  
  // Arrays für Mehrfachauswahl erstellen
  const [gemeindeValues, setGemeindeValues] = useState<string[]>(gemeindeParam ? gemeindeParam.split(',') : []);
  const [habitatValues, setHabitatValues] = useState<string[]>(habitatParam ? habitatParam.split(',') : []);
  const [habitatfamilieValues, setHabitatfamilieValues] = useState<string[]>(habitatfamilieParam ? habitatfamilieParam.split(',') : []);
  const [schutzstatusValues, setSchutzstatusValues] = useState<string[]>(schutzstatusParam ? schutzstatusParam.split(',') : []);
  const [personValues, setPersonValues] = useState<string[]>(personParam ? personParam.split(',') : []);
  const [organizationValues, setOrganizationValues] = useState<string[]>(organizationParam ? organizationParam.split(',') : []);
  const [verifizierungValues, setVerifizierungValues] = useState<string[]>(
    verifizierungsstatus !== 'alle' ? [verifizierungsstatus] : []
  );
  
  // Aktive Filter zählen
  const activeFilterCount = [
    gemeindeValues.length > 0,
    habitatValues.length > 0,
    habitatfamilieValues.length > 0,
    schutzstatusValues.length > 0,
    personValues.length > 0,
    organizationValues.length > 0,
    verifizierungValues.length > 0,
    search !== ''
  ].filter(Boolean).length;
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          sortBy,
          sortOrder,
          limit: '12' // Zeige 12 Einträge pro Seite an
        });
        
        // Filtern nach verschiedenen Kriterien
        if (search) queryParams.set('search', search);
        if (gemeindeValues.length > 0) queryParams.set('gemeinde', gemeindeValues.join(','));
        if (habitatValues.length > 0) queryParams.set('habitat', habitatValues.join(','));
        if (habitatfamilieValues.length > 0) queryParams.set('habitatfamilie', habitatfamilieValues.join(','));
        if (schutzstatusValues.length > 0) queryParams.set('schutzstatus', schutzstatusValues.join(','));
        if (personValues.length > 0) queryParams.set('person', personValues.join(','));
        if (organizationValues.length > 0) queryParams.set('organization', organizationValues.join(','));
        
        queryParams.set('verifizierungsstatus', 'verifiziert');
        
        const response = await fetch(`/api/habitat/public?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unbekannter Fehler');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [page, sortBy, sortOrder, search, gemeindeValues, habitatValues, habitatfamilieValues, schutzstatusValues, personValues, organizationValues, verifizierungValues]);
  
  // Seitenwechsel
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/unsere-habitate?${params.toString()}`);
  };
  
  // Sortierung ändern
  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value === 'newest') {
      params.set('sortBy', 'updatedAt');
      params.set('sortOrder', 'desc');
    } else if (value === 'oldest') {
      params.set('sortBy', 'updatedAt');
      params.set('sortOrder', 'asc');
    }
    
    params.set('page', '1');
    router.push(`/unsere-habitate?${params.toString()}`);
  };
  
  // Filter ändern
  const handleFilterChange = (filterType: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value !== 'alle') {
      params.set(filterType, value);
    } else {
      params.delete(filterType);
    }
    
    params.set('page', '1');
    router.push(`/unsere-habitate?${params.toString()}`);
  };
  
  // Suche starten
  const handleSearch = () => {
    const params = new URLSearchParams(searchParams);
    
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    
    params.set('page', '1');
    router.push(`/unsere-habitate?${params.toString()}`);
  };
  
  // Alle Filter zurücksetzen
  const resetAllFilters = () => {
    // Lokale Filter-Zustände zurücksetzen
    setGemeindeValues([]);
    setHabitatValues([]);
    setHabitatfamilieValues([]);
    setSchutzstatusValues([]);
    setPersonValues([]);
    setOrganizationValues([]);
    setVerifizierungValues([]);
    setSearchInput('');
    
    // URL-Parameter zurücksetzen
    const params = new URLSearchParams();
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('page', '1');
    router.push(`/unsere-habitate?${params.toString()}`);
  };
  
  // Hilfsfunktion zum Umwandeln des Schutzstatus in ein lesbares Format für die HabitatCard
  const mapSchutzstatusToStatus = (schutzstatus: string): string => {
    switch (schutzstatus?.toLowerCase()) {
      case 'gesetzlich geschützt':
        return 'gesetzlich';
      case 'nicht gesetzlich geschützt, aber schützenswert':
        return 'hochwertig';
      case 'standardvegetation':
        return 'standard';
      default:
        return 'standard';
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Unsere Habitate</h1>
        <p className="text-gray-600">Entdecken Sie die verifizierten Habitate unserer Gemeinschaft</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Linke Spalte mit Filtern */}
        <div className="w-full md:w-1/4 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-base">Filter</h3>
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetAllFilters}
                  className="h-8 px-2 text-xs"
                >
                  <FilterX className="h-3 w-3 mr-1" />
                  <span>Zurücksetzen ({activeFilterCount})</span>
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Suchfeld */}
              <div className="space-y-2">
                <label className="text-sm font-medium mb-1 block">Suche</label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Suchen..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pr-10"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="absolute right-0 top-0 h-full px-3" 
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Gemeinde Filter */}
              <div className="space-y-2">
                <MultiSelectFilter
                  type="gemeinden"
                  value={gemeindeValues}
                  onValueChange={(value) => setGemeindeValues(value)}
                  placeholder="Gemeinden"
                />
              </div>
              
              {/* Habitat Filter */}
              <div className="space-y-2">
                <MultiSelectFilter
                  type="habitate"
                  value={habitatValues}
                  onValueChange={(value) => setHabitatValues(value)}
                  placeholder="Habitattyp"
                />
              </div>
              
              {/* Habitatfamilie Filter */}
              <div className="space-y-2">
                <MultiSelectFilter
                  type="familien"
                  value={habitatfamilieValues}
                  onValueChange={(value) => setHabitatfamilieValues(value)}
                  placeholder="Habitat Gruppe"
                />
              </div>
              
              {/* Schutzstatus Filter */}
              <div className="space-y-2">
                <MultiSelectFilter
                  type="schutzstati"
                  value={schutzstatusValues}
                  onValueChange={(value) => setSchutzstatusValues(value)}
                  placeholder="Schutzstatus"
                />
              </div>
              
              {/* Erfasser Filter */}
              <div className="space-y-2">
                <MultiSelectFilter
                  type="personen"
                  value={personValues}
                  onValueChange={(value) => setPersonValues(value)}
                  placeholder="Erfasser"
                />
              </div>
              
              {/* Organisations Filter */}
              <div className="space-y-2">
                <MultiSelectFilter
                  type="organizations"
                  value={organizationValues}
                  onValueChange={(value) => setOrganizationValues(value)}
                  placeholder="Organisation"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Rechte Spalte mit Ergebnissen */}
        <div className="w-full md:w-3/4">
          <div className="flex justify-between items-center mb-4">
            <div>
              {/* Aktive Filter anzeigen */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {search && (
                    <Badge variant="secondary" className="text-xs">
                      Suche: {search}
                    </Badge>
                  )}
                  {gemeindeValues.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Gemeinde: {gemeindeValues.join(', ')}
                    </Badge>
                  )}
                  {habitatValues.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Habitattyp: {habitatValues.join(', ')}
                    </Badge>
                  )}
                  {habitatfamilieValues.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Gruppe: {habitatfamilieValues.join(', ')}
                    </Badge>
                  )}
                  {schutzstatusValues.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Schutzstatus: {schutzstatusValues.join(', ')}
                    </Badge>
                  )}
                  {personValues.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Erfasser: {personValues.join(', ')}
                    </Badge>
                  )}
                  {organizationValues.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Organisation: {organizationValues.join(', ')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sortieren nach:</span>
              <Select
                value={sortOrder === 'desc' ? 'newest' : 'oldest'}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sortierung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Neueste zuerst</SelectItem>
                  <SelectItem value="oldest">Älteste zuerst</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md my-4">
              <h3 className="text-lg font-medium mb-2">Fehler</h3>
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && data && data.entries.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg my-4 text-center">
              <h3 className="text-lg font-medium mb-2">Keine Habitate gefunden</h3>
              <p className="text-gray-500">
                {activeFilterCount > 0
                  ? 'Es wurden keine Habitate gefunden, die Ihren Filterkriterien entsprechen.'
                  : 'Es wurden noch keine verifizierten Habitate erfasst.'}
              </p>
            </div>
          )}
          
          {!loading && !error && data && data.entries.length > 0 && (
            <>
              {/* Ergebnisinfo anzeigen */}
              <div className="mb-4 text-sm text-gray-600">
                {data.pagination.total} {data.pagination.total === 1 ? 'Habitat' : 'Habitate'} gefunden
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {data.entries.map((habitat) => (
                  <div key={habitat.jobId} className="aspect-[16/9] w-full">
                    <HabitatCard
                      imageSrc={habitat.metadata.bilder?.[0]?.url.replace('.jpg', '_low.jpg') || '/images/habitat-placeholder.jpg'}
                      title={habitat.result?.habitattyp || 'Unbekanntes Habitat'}
                      location={habitat.metadata.gemeinde || 'Unbekannter Ort'}
                      recorder={habitat.metadata.erfassungsperson || ''}
                      status={mapSchutzstatusToStatus(habitat.result?.schutzstatus || '')}
                      org={habitat.metadata.organizationName || ''}
                      orgLogo={habitat.metadata.organizationLogo || ''}
                    />
                  </div>
                ))}
              </div>
              
              {/* Paginierung */}
              {data.pagination && data.pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="flex items-center"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Zurück
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        const isCurrentPage = page === pageNum;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={isCurrentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 p-0 ${isCurrentPage ? 'pointer-events-none' : ''}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      {data.pagination.totalPages > 5 && (
                        <>
                          <span className="text-gray-500">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(data.pagination.totalPages)}
                            className="w-8 h-8 p-0"
                          >
                            {data.pagination.totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= data.pagination.totalPages}
                      className="flex items-center"
                    >
                      Weiter
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsereHabitatePage() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center">Laden...</div>}>
      <UnsereHabitateContent />
    </Suspense>
  );
} 