"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { FolderArchive, Database, Plus, Info, ShieldAlert } from 'lucide-react';
import { ArchiveList } from './components/archive-list';
import { SearchBar } from './components/search-bar';
import { Pagination } from '@/components/ui/pagination';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ArchiveEntry {
  jobId: string;
  status: string;
  metadata: {
    erfassungsperson?: string;
    email?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

interface ArchiveData {
  entries: ArchiveEntry[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
  allPersons?: string[];
  userRole?: {
    isAdmin: boolean;
    isBiologist: boolean;
    hasAdvancedPermissions: boolean;
  };
}

export default function ArchivPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<ArchiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [personen, setPersonen] = useState<string[]>([]);
  const [isBiologist, setIsBiologist] = useState(false);
  const [hasAdvancedPermissions, setHasAdvancedPermissions] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  
  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const selectedPerson = searchParams.get('person') || '';
  
  // Prüfen, ob der aktuelle Benutzer erweiterte Berechtigungen hat (Biologe oder Admin)
  useEffect(() => {
    const checkPermissions = async () => {
      setIsLoadingPermissions(true);
      try {
        // Prüfen, ob der Benutzer ein Biologe ist
        const responseBiologist = await fetch('/api/users/isBiologist');
        const dataBiologist = await responseBiologist.json();
        setIsBiologist(dataBiologist.isBiologist);
        
        // Prüfen, ob der Benutzer erweiterte Rechte hat (Biologe oder Admin)
        const responseAdvanced = await fetch('/api/users/hasAdvancedPermissions');
        const dataAdvanced = await responseAdvanced.json();
        setHasAdvancedPermissions(dataAdvanced.hasAdvancedPermissions);
      } catch (error) {
        console.error('Fehler beim Überprüfen der Benutzerberechtigungen:', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    checkPermissions();
  }, []);
  
  // Funktion zum Extrahieren eindeutiger Personen aus den Daten
  const extractUniquePersons = (entries: ArchiveEntry[]) => {
    if (!entries || entries.length === 0) return [];
    
    const uniquePersons = new Set<string>();
    entries.forEach(entry => {
      if (entry.metadata?.erfassungsperson) {
        uniquePersons.add(entry.metadata.erfassungsperson);
      }
    });
    
    return Array.from(uniquePersons).sort();
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
        
        if (search) {
          queryParams.set('search', search);
        }
        
        if (selectedPerson) {
          queryParams.set('person', selectedPerson);
        }
        
        const response = await fetch(`/api/archiv?${queryParams.toString()}`);
        
        if (!response.ok) {
          console.error('API-Fehler:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Fehlerdetails:', errorText);
          throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
        
        // Wenn die API die Nutzerrolle zurückgibt, aktualisiere den lokalen Status
        if (result.userRole) {
          setIsBiologist(result.userRole.isBiologist);
          setHasAdvancedPermissions(result.userRole.hasAdvancedPermissions);
        }
        
        // Extrahiere eindeutige Personen aus den Daten
        // Hier können wir alle Einträge verwenden, falls die API diese Information liefert
        if (result.allPersons) {
          setPersonen(result.allPersons);
        } else if (result.entries) {
          setPersonen(extractUniquePersons(result.entries));
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
  }, [page, search, sortBy, sortOrder, selectedPerson]);
  
  const handleSearch = (term: string) => {
    // Setzen des Suchbegriffs und zurück zur ersten Seite
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('search', term);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/archiv?${params.toString()}`);
  };
  
  const handlePersonChange = (person: string) => {
    const params = new URLSearchParams(searchParams);
    if (person && person !== 'alle') {
      params.set('person', person);
    } else {
      params.delete('person');
    }
    params.set('page', '1');
    router.push(`/archiv?${params.toString()}`);
  };
  
  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams);
    const currentSortBy = params.get('sortBy') || 'updatedAt';
    const currentSortOrder = params.get('sortOrder') || 'desc';
    
    // Wenn das gleiche Feld erneut angeklickt wird, ändere die Sortierrichtung
    if (field === currentSortBy) {
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', field);
      params.set('sortOrder', 'desc'); // Standard ist absteigend
    }
    
    router.push(`/archiv?${params.toString()}`);
  };
  
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/archiv?${params.toString()}`);
  };
  
  const handleDelete = async (jobId: string) => {
    setDeleteLoading(jobId);
    try {
      const response = await fetch(`/api/archiv/${jobId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen des Eintrags');
      }
      
      // Datensatz aus der Liste entfernen oder neu laden
      if (data) {
        const updatedEntries = data.entries.filter((entry) => entry.jobId !== jobId);
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
      console.error('Fehler beim Löschen:', error);
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler beim Löschen'}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Zeige Ladeindikator während der Berechtigungsprüfung
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
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <SignedIn>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">Archiv der Habitaterfassungen</h1>
          
          {/* Zusätzliche Aktionen für Biologen und Admins */}
          {hasAdvancedPermissions && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/import')}>
                <Database className="mr-2 h-4 w-4" />
                Daten importieren
              </Button>
              {isBiologist && (
                <Button variant="default" size="sm" onClick={() => router.push('/archiv/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Neu anlegen
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Warnung für Benutzer ohne erweiterte Berechtigungen */}
        {!hasAdvancedPermissions && (
          <Alert className="mb-6 bg-blue-50">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Eingeschränkte Ansicht</AlertTitle>
            <AlertDescription>
              Sie haben nur Zugriff auf Ihre eigenen Einträge. Administratoren und Biologen können alle Einträge sehen.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-2">
            <SearchBar value={search} onSearch={handleSearch} />
          </div>
          
          {/* Personenfilter nur für Admins und Biologen anzeigen */}
          {hasAdvancedPermissions && personen.length > 0 && (
            <div>
              <Select 
                value={selectedPerson || 'alle'} 
                onValueChange={handlePersonChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Person auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Personen</SelectItem>
                  {personen.map((person) => (
                    <SelectItem key={person} value={person}>
                      {person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {error ? (
          <Alert variant="destructive" className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Fehler</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : data?.entries && data.entries.length > 0 ? (
          <>
            <ArchiveList 
              entries={data.entries} 
              onSort={handleSort} 
              currentSortBy={sortBy} 
              currentSortOrder={sortOrder}
              onDelete={handleDelete}
            />
            
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination 
                  currentPage={page} 
                  totalPages={data.pagination.totalPages} 
                  onPageChange={handlePageChange} 
                />
              </div>
            )}
          </>
        ) : (
          <div className="bg-gray-50 p-12 text-center rounded-lg">
            <FolderArchive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine Einträge gefunden</h3>
            <p className="text-gray-500 mb-6">
              {hasAdvancedPermissions 
                ? 'Es wurden keine Einträge gefunden, die Ihren Suchkriterien entsprechen.' 
                : 'Sie haben noch keine Habitaterfassungen durchgeführt.'}
            </p>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
            >
              Zurück zur Startseite
            </Button>
          </div>
        )}
      </SignedIn>
      
      <SignedOut>
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto text-center">
          <FolderArchive className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-4">Anmeldung erforderlich</h2>
          <p className="mb-6 text-gray-600">
            Bitte melden Sie sich an, um auf das Archiv der Habitaterfassungen zugreifen zu können.
          </p>
          <SignInButton>
            <Button size="lg">
              Anmelden
            </Button>
          </SignInButton>
        </div>
      </SignedOut>
    </div>
  );
} 