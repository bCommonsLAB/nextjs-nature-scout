"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Plus, ShieldAlert, X, Download, Trash2 } from 'lucide-react';
import { HabitateList } from './components/habitate-list';
import { SearchBar } from './components/search-bar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FilterSelect } from './components/filter-select';

interface HabitateEntry {
  jobId: string;
  status: string;
  metadata: {
    erfassungsperson?: string;
    email?: string;
    gemeinde?: string;
    flurname?: string;
    latitude?: number;
    longitude?: number;
    standort?: string;
    bilder?: Array<{url: string}>;
    kommentar?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
  verified?: boolean;
  verifiedAt?: string;
  result?: {
    habitattyp?: string;
    schutzstatus?: string;
    zusammenfassung?: string;
  };
  error?: string;
}

interface HabitateData {
  entries: HabitateEntry[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
  allPersons?: string[];
  userRole?: {
    isAdmin: boolean;
    isExpert: boolean;
    hasAdvancedPermissions: boolean;
  };
}

function HabitatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<HabitateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpert, setisExpert] = useState(false);
  const [hasAdvancedPermissions, setHasAdvancedPermissions] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const selectedPerson = searchParams.get('person') || '';
  const selectedGemeinde = searchParams.get('gemeinde') || '';
  const selectedHabitat = searchParams.get('habitat') || '';
  const selectedHabitatFamilie = searchParams.get('habitatfamilie') || '';
  const selectedSchutzstatus = searchParams.get('schutzstatus') || '';
  const selectedPruefstatus = searchParams.get('pruefstatus') || '';
  
  useEffect(() => {
    const checkPermissions = async () => {
      setIsLoadingPermissions(true);
      try {
        const responseExpert = await fetch('/api/users/isExpert');
        const dataExpert = await responseExpert.json();
        setisExpert(dataExpert.isExpert);
        
        const responseAdmin = await fetch('/api/users/isAdmin');
        const dataAdmin = await responseAdmin.json();
        setIsAdmin(dataAdmin.isAdmin);
        
        // Setze hasAdvancedPermissions basierend auf isAdmin oder isExpert
        setHasAdvancedPermissions(dataAdmin.isAdmin || dataExpert.isExpert);
      } catch (error) {
        console.error('Fehler beim Überprüfen der Benutzerberechtigungen:', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    checkPermissions();
  }, []);
  
  const debugLog = (section: string, data: Record<string, unknown>) => {
    console.log(`[DEBUG:${section}]`, data);
  };
  
  useEffect(() => {
    try {
      debugLog('FilterData', { dataExists: !!data, entriesCount: data?.entries?.length || 0 });
      
      if (data?.entries) {
        const filters = [];
        if (selectedPerson) filters.push(`Person: ${selectedPerson}`);
        if (selectedGemeinde) filters.push(`Gemeinde: ${selectedGemeinde}`);
        if (selectedHabitat) filters.push(`Habitat: ${selectedHabitat}`);
        if (selectedHabitatFamilie) filters.push(`Familie: ${selectedHabitatFamilie}`);
        if (selectedSchutzstatus) filters.push(`Schutz: ${selectedSchutzstatus}`);
        if (selectedPruefstatus) {
          const status = selectedPruefstatus === 'verified' ? 'Verifiziert' : 
                         (selectedPruefstatus === 'rejected' ? 'Abgelehnt' : 'Ungeprüft');
          filters.push(`Status: ${status}`);
        }
        
        setActiveFilters(filters);
      }
    } catch (error) {
      console.error('Fehler beim Extrahieren der Filterdaten:', error);
    }
  }, [data, selectedPerson, selectedGemeinde, selectedHabitat, selectedHabitatFamilie, selectedSchutzstatus, selectedPruefstatus]);
  
  const applyFilter = (filterType: string, value: string) => {
    try {
      debugLog('ApplyFilter', { filterType, value });
      
      const params = new URLSearchParams(searchParams);
      
      if (value && value !== 'alle') {
        params.set(filterType, value);
      } else {
        params.delete(filterType);
      }
      
      params.set('page', '1');
      router.push(`/habitat?${params.toString()}`);
    } catch (error) {
      console.error('Fehler beim Anwenden des Filters:', error);
    }
  };
  
  const removeFilter = (filterString: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (filterString.startsWith('Person:')) params.delete('person');
    if (filterString.startsWith('Gemeinde:')) params.delete('gemeinde');
    if (filterString.startsWith('Habitat:')) params.delete('habitat');
    if (filterString.startsWith('Familie:')) params.delete('habitatfamilie');
    if (filterString.startsWith('Schutz:')) params.delete('schutzstatus');
    if (filterString.startsWith('Status:')) params.delete('pruefstatus');
    
    params.set('page', '1');
    router.push(`/habitat?${params.toString()}`);
  };
  
  const resetAllFilters = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (sortBy !== 'updatedAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    
    router.push(`/habitat?${params.toString()}`);
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          sortBy,
          sortOrder
        });
        
        if (search) queryParams.set('search', search);
        if (selectedPerson) queryParams.set('person', selectedPerson);
        if (selectedGemeinde) queryParams.set('gemeinde', selectedGemeinde);
        if (selectedHabitat) queryParams.set('habitat', selectedHabitat);
        if (selectedHabitatFamilie) queryParams.set('habitatfamilie', selectedHabitatFamilie);
        if (selectedSchutzstatus) queryParams.set('schutzstatus', selectedSchutzstatus);
        if (selectedPruefstatus) queryParams.set('pruefstatus', selectedPruefstatus);
        
        const response = await fetch(`/api/habitat?${queryParams.toString()}`);
        
        if (!response.ok) {
          console.error('API-Fehler:', response.status, response.statusText);
          const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
          console.error('Fehlerdetails:', errorData);
          
          // Spezifische Fehlermeldung für "Benutzer nicht gefunden"
          if (errorData.error === 'Benutzer nicht gefunden') {
            throw new Error('Ihr Benutzerkonto wurde in der Datenbank nicht gefunden. Bitte melden Sie sich ab und wieder an, oder kontaktieren Sie den Administrator.');
          } else {
            throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
          }
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
        
        // Debug: Überprüfe Paginierungsdaten
        console.log('Paginierungsdaten:', {
          pagination: result.pagination,
          totalPages: result.pagination?.totalPages,
          currentPage: result.pagination?.currentPage
        });
        
        if (result.userRole) {
          setisExpert(result.userRole.isExpert);
          setHasAdvancedPermissions(result.userRole.hasAdvancedPermissions);
        }

        // Prüfe, ob wir von einer Verifizierung zurückkommen und scrolle zur Position
        if (typeof window !== 'undefined') {
          const justVerified = sessionStorage.getItem('habitat_just_verified');
          const verifiedId = sessionStorage.getItem('habitat_verified_id');
          
          if (justVerified === 'true' && verifiedId) {
            // Entferne die Flags
            sessionStorage.removeItem('habitat_just_verified');
            sessionStorage.removeItem('habitat_verified_id');
            
            // Warte einen Moment, bis die Komponente gerendert ist
            setTimeout(() => {
              const verifiedElement = document.getElementById(`habitat-row-${verifiedId}`);
              if (verifiedElement) {
                verifiedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                verifiedElement.classList.add('bg-green-50');
                setTimeout(() => {
                  verifiedElement.classList.remove('bg-green-50');
                  verifiedElement.classList.add('bg-white');
                }, 2000);
              }
            }, 500);
          }
        }
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
  }, [page, search, sortBy, sortOrder, selectedPerson, selectedGemeinde, selectedHabitat, selectedHabitatFamilie, selectedSchutzstatus, selectedPruefstatus]);
  
  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      params.set('search', term);
    } else {
      params.delete('search');
    }
    
    params.set('page', '1');
    router.push(`/habitat?${params.toString()}`);
  };
  
  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (field === sortBy) {
      params.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', field);
      params.set('sortOrder', 'asc');
    }
    
    router.push(`/habitat?${params.toString()}`);
  };
  
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/habitat?${params.toString()}`);
  };
  
  const handleDelete = async (jobId: string) => {
    try {
      const response = await fetch(`/api/habitat/${jobId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Fehler ${response.status}: ${response.statusText}`);
      }
      
      const updatedEntries = data?.entries.filter(entry => entry.jobId !== jobId) || [];
      if (data) {
        setData({
          ...data,
          entries: updatedEntries,
          pagination: {
            ...data.pagination,
            total: data.pagination.total - 1
          }
        });
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Eintrags:', error);
      alert('Fehler beim Löschen des Eintrags');
    }
  };
  
  // Funktion zum Herunterladen aller Habitat-Daten
  const handleDownloadHabitatData = () => {
    window.location.href = '/api/habitat/download';
  };
  
  // Funktion zum Löschen aller Einträge ohne result-Objekt
  const handleCleanupData = async () => {
    if (!confirm("Möchten Sie wirklich alle Einträge ohne result-Objekt löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return;
    }
    
    try {
      const response = await fetch('/api/habitat/cleanup/user', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Fehler ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      alert(`${data.deletedCount} Einträge ohne result-Objekt wurden erfolgreich gelöscht.`);
      
      // Seite neu laden, um die Änderungen anzuzeigen
      window.location.reload();
    } catch (error) {
      console.error('Fehler beim Löschen der Einträge:', error);
      alert('Fehler beim Löschen der Einträge ohne result-Objekt');
    }
  };
  
  if (isLoadingPermissions) {
    return (
      <div className="container mx-auto py-8 px-2 sm:px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
        <div className="flex items-center">
          <ShieldCheck className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">{isExpert || isAdmin ? "Habitatverwaltung" : "Meine Habitate"}</h1>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleDownloadHabitatData}
              >
                <Download className="h-4 w-4" />
                Daten herunterladen
              </Button>
              
              {/* Button zum Löschen aller Einträge des Benutzers 
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={handleCleanupData}
              >
                <Trash2 className="h-4 w-4" />
                Leere Einträge löschen
              </Button>
              */}
            </>
          )}
          {hasAdvancedPermissions && isExpert && (
            <Button variant="default" size="sm" onClick={() => router.push('/naturescout')}>
              <Plus className="mr-2 h-4 w-4" />
              Neues Habitat
            </Button>
          )}
          
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Anmelden zum Habitaterfassen
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
      
      {!hasAdvancedPermissions && (
        <Alert className="mb-6 bg-blue-50">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Hinweis</AlertTitle>
          <AlertDescription>
            Als registrierter Benutzer sehen Sie hier Ihre eigenen Habitaterfassungen. Nur verifizierte Experten können alle Einträge sehen.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetAllFilters} className="h-8 text-xs">
                Filter zurücksetzen
              </Button>
            )}
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center mb-4">
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer px-3 py-1">
                <span>{filter}</span>
                <X 
                  className="ml-2 h-3 w-3 text-gray-500 hover:text-red-500"
                  onClick={() => removeFilter(filter)}
                />
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center mb-8">
          {hasAdvancedPermissions && (
            <FilterSelect
              type="personen"
              value={selectedPerson || 'alle'}
              onValueChange={(value) => applyFilter('person', value)}
              placeholder="Person"
              allLabel="Alle Personen"
            />
          )}
          
          <FilterSelect
            type="gemeinden"
            value={selectedGemeinde || 'alle'}
            onValueChange={(value) => applyFilter('gemeinde', value)}
            placeholder="Gemeinde"
            allLabel="Alle Gemeinden"
          />
          
          <FilterSelect
            type="habitate"
            value={selectedHabitat || 'alle'}
            onValueChange={(value) => applyFilter('habitat', value)}
            placeholder="Habitattyp"
            allLabel="Alle Habitate"
          />
          
          <FilterSelect
            type="familien"
            value={selectedHabitatFamilie || 'alle'}
            onValueChange={(value) => applyFilter('habitatfamilie', value)}
            placeholder="Gruppe"
            allLabel="Alle Gruppen"
          />
          
          <FilterSelect
            type="schutzstati"
            value={selectedSchutzstatus || 'alle'}
            onValueChange={(value) => applyFilter('schutzstatus', value)}
            placeholder="Schutzstatus"
            allLabel="Alle Schutzstatus"
          />
          
          <Select value={selectedPruefstatus || 'alle'} onValueChange={(value) => applyFilter('pruefstatus', value)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Prüfstatus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Prüfstatus</SelectItem>
              <SelectItem value="unverified">Ungeprüft</SelectItem>
              <SelectItem value="verified">Verifiziert</SelectItem>
            </SelectContent>
          </Select>

          <SearchBar
            value={search}
            onSearch={handleSearch}
            compact={true}
          />
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
          <p className="mb-4">{error}</p>
          
          {error.includes('Benutzerkonto wurde in der Datenbank nicht gefunden') && (
            <div className="mt-4 space-y-2">
              <p className="text-gray-700 text-sm">Was können Sie tun:</p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Melden Sie sich ab und anschließend wieder an</li>
                <li>Falls der Fehler weiterhin besteht, kontaktieren Sie bitte den Administrator</li>
              </ul>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.href = "/"}
              >
                Zurück zur Startseite
              </Button>
            </div>
          )}
        </div>
      )}
      
      {!loading && !error && data && data.entries.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg my-4 text-center">
          <div className="mb-4">
            <ShieldCheck className="h-10 w-10 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-lg font-medium mb-2">Keine Einträge gefunden</h3>
          <p className="text-gray-500 mb-6">
            {hasAdvancedPermissions 
              ? 'Es wurden keine Einträge gefunden, die Ihren Suchkriterien entsprechen.' 
              : 'Sie haben noch keine Habitaterfassungen durchgeführt.'}
          </p>
          <SignedIn>
            <Button onClick={() => router.push('/naturescout')}>
              <Plus className="mr-2 h-4 w-4" />
              Neues Habitat erfassen
            </Button>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Anmelden zum Habitaterfassen
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      )}
      
      {!loading && !error && data && data.entries.length > 0 && (
        <>
          <HabitateList 
            entries={data.entries} 
            onSort={handleSort}
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onDelete={hasAdvancedPermissions ? handleDelete : undefined}
          />
          
          {/* Einfache Paginierungsnavigation mit Tabs - immer anzeigen */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-2 border border-gray-300 rounded-l-md text-sm font-medium disabled:opacity-50 bg-white hover:bg-gray-50"
              >
                ← Zurück
              </button>
              
              {/* Tabs für Seitenzahlen */}
              <div className="flex">
                {data.pagination && (function RenderPageTabs() {
                  const totalPages = data.pagination.totalPages;
                  const maxVisibleTabs = 10; // Maximale Anzahl an sichtbaren Tabs
                  
                  // Wenn weniger oder gleich maxVisibleTabs Seiten, zeige alle
                  if (totalPages <= maxVisibleTabs) {
                    return Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium ${
                          pageNum === page
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ));
                  }
                  
                  // Bei mehr Seiten, intelligentes Auswahlsystem
                  const visiblePages = new Set<number>();
                  
                  // Füge aktuelle Seite und benachbarte Seiten hinzu
                  const rangeAround = 2; // Anzahl der Seiten vor und nach der aktuellen Seite
                  for (let i = Math.max(1, page - rangeAround); i <= Math.min(totalPages, page + rangeAround); i++) {
                    visiblePages.add(i);
                  }
                  
                  // Füge erste und letzte Seite hinzu
                  visiblePages.add(1);
                  visiblePages.add(totalPages);
                  
                  // Sortiere die sichtbaren Seiten
                  const visiblePagesArray = Array.from(visiblePages).sort((a, b) => a - b);
                  
                  // Rendern der Tabs mit Ellipsen, wenn nötig
                  return visiblePagesArray.map((pageNum, index) => {
                    // Stellt sicher, dass previousPage immer einen Wert hat
                    const previousPage = index > 0 ? (visiblePagesArray[index - 1] ?? 0) : 0;
                    
                    // Füge Ellipsis hinzu, wenn es eine Lücke gibt
                    const showEllipsisBefore = index > 0 && pageNum - previousPage > 1;
                    
                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsisBefore && (
                          <button 
                            className="px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium bg-white text-gray-500"
                            disabled
                          >
                            ...
                          </button>
                        )}
                        <button
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium ${
                            pageNum === page
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
              
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={data.pagination && page >= data.pagination.totalPages}
                className="px-3 py-2 border border-gray-300 rounded-r-md text-sm font-medium disabled:opacity-50 bg-white hover:bg-gray-50"
              >
                Weiter →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function HabitatPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center">Laden...</div>}>
      <HabitatPageContent />
    </Suspense>
  );
} 