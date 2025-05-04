"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Trash2, Image, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CleanupResult {
  simulateOnly: boolean;
  autoDeleteUnused: boolean;
  statistics: {
    totalImages: number;
    usedImages: number;
    unusedImages: number;
    imagesWithoutLowRes: number;
    createdLowResVersions: number;
    updatedDocuments: number;
    deletedImages: number;
    failedDeletes: number;
    skippedLowResImages: number;
  };
  sampleData?: {
    unusedImages: string[];
    imagesNeedingLowRes: string[];
  };
  message: string;
}

interface DeleteResult {
  success: boolean;
  simulateOnly: boolean;
  statistics: {
    requestedToDelete: number;
    safeToDelete: number;
    cannotDelete: number;
    actuallyDeleted: number;
  };
  message: string;
}

export default function StorageCleanupPage() {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);
  const [simulateOnly, setSimulateOnly] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  const startCleanup = async () => {
    setLoading(true);
    setError(null);
    try {
      const simulateParam = simulateOnly ? 'true' : 'false';
      const deleteParam = autoDelete ? 'true' : 'false';
      console.log(`Starte Storage-Bereinigung, Parameter: simulate=${simulateParam}, delete=${deleteParam}`);
      
      let url = `/api/admin/storage-cleanup?simulate=${simulateParam}`;
      if (autoDelete) {
        url += `&delete=${deleteParam}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP Fehler: ${response.status} - ${errorText}`);
        throw new Error(`HTTP Fehler! Status: ${response.status}, Antwort: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Bereinigungsergebnis:", data);
      setResult(data);
    } catch (e) {
      console.error("Fehler bei der Anfrage:", e);
      setError(`Fehler bei der Anfrage: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const deleteSelectedImages = async () => {
    if (!selectedImages.length) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      console.log(`Starte Löschvorgang für ${selectedImages.length} Bilder, simulateOnly=${simulateOnly}`);
      console.log("Zu löschende Bilder:", selectedImages);
      
      const response = await fetch('/api/admin/storage-cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deleteImages: selectedImages,
          simulateOnly
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP Fehler: ${response.status} - ${errorText}`);
        throw new Error(`HTTP Fehler! Status: ${response.status}, Antwort: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Löschergebnis:", data);
      setDeleteResult(data);
      
      // Bei Erfolg die ausgewählten Bilder zurücksetzen
      if (data.success && !simulateOnly) {
        setSelectedImages([]);
      }
    } catch (e) {
      console.error("Fehler beim Löschen:", e);
      setError(`Fehler beim Löschen: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeleting(false);
    }
  };
  
  const toggleImageSelection = (url: string) => {
    setSelectedImages(prev => 
      prev.includes(url)
        ? prev.filter(item => item !== url)
        : [...prev, url]
    );
  };
  
  const toggleAllImages = () => {
    if (result?.sampleData?.unusedImages) {
      if (selectedImages.length === result.sampleData.unusedImages.length) {
        // Alle abwählen
        setSelectedImages([]);
      } else {
        // Alle auswählen
        setSelectedImages([...result.sampleData.unusedImages]);
      }
    }
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Azure Storage Bereinigung</h1>
          <p className="text-gray-500 mt-1">Verwalte nicht verwendete Bilder und erstelle Low-Resolution-Versionen</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Switch 
              id="simulate" 
              checked={simulateOnly} 
              onCheckedChange={setSimulateOnly}
            />
            <Label htmlFor="simulate">Nur simulieren (keine Änderungen durchführen)</Label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Im Simulationsmodus werden keine echten Änderungen vorgenommen.
          </p>
          
          {!simulateOnly && (
            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="autoDelete" 
                  checked={autoDelete} 
                  onCheckedChange={setAutoDelete}
                />
                <Label htmlFor="autoDelete" className="font-semibold">Ungenutzte Bilder automatisch löschen</Label>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                <span className="text-red-500 font-semibold">Achtung:</span> Diese Option löscht alle ungenutzten Bilder sofort.
              </p>
            </div>
          )}
        </div>
        
        <Button 
          onClick={startCleanup} 
          disabled={loading}
          className="w-48"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Läuft...
            </>
          ) : (
            <>
              <Image className="mr-2 h-4 w-4" />
              Storage analysieren
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="unusedImages">
              Unbenutzte Bilder ({result.statistics.unusedImages})
            </TabsTrigger>
            <TabsTrigger value="lowRes">
              Low-Res Bilder ({result.statistics.imagesWithoutLowRes})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Statistiken</CardTitle>
                <CardDescription>
                  {result.simulateOnly 
                    ? 'Simulation der Storage-Bereinigung'
                    : 'Ergebnis der Storage-Bereinigung'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Bilder insgesamt</p>
                    <p className="text-3xl font-bold">{result.statistics.totalImages}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">In Verwendung</p>
                    <p className="text-3xl font-bold">{result.statistics.usedImages}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-text-gray-500">Nicht verwendet</p>
                    <p className="text-3xl font-bold">{result.statistics.unusedImages}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Ohne Low-Res Version</p>
                    <p className="text-3xl font-bold">{result.statistics.imagesWithoutLowRes}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Erstellte Low-Res Versionen</p>
                    <p className="text-3xl font-bold">{result.statistics.createdLowResVersions}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Aktualisierte Dokumente</p>
                    <p className="text-3xl font-bold">{result.statistics.updatedDocuments}</p>
                  </div>
                  
                  {/* Zeige Löschstatistiken nur an, wenn automatisches Löschen aktiviert war */}
                  {result.autoDeleteUnused && !result.simulateOnly && (
                    <>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Gelöschte Bilder</p>
                        <p className="text-3xl font-bold text-green-600">{result.statistics.deletedImages}</p>
                      </div>
                      {result.statistics.skippedLowResImages > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-gray-500">Übersprungene Low-Res Bilder</p>
                          <p className="text-3xl font-bold text-blue-600">{result.statistics.skippedLowResImages}</p>
                          <p className="text-xs text-gray-500 mt-1">Low-Res Bilder, deren Hauptbild noch in Verwendung ist</p>
                        </div>
                      )}
                      {result.statistics.failedDeletes > 0 && (
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-gray-500">Fehlgeschlagene Löschungen</p>
                          <p className="text-3xl font-bold text-red-600">{result.statistics.failedDeletes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-gray-500">{result.message}</p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="unusedImages">
            <Card>
              <CardHeader>
                <CardTitle>Unbenutzte Bilder</CardTitle>
                <CardDescription>
                  Diese Bilder sind nicht mit Habitaten verknüpft und können gelöscht werden.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.sampleData?.unusedImages && result.sampleData.unusedImages.length > 0 ? (
                  <>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox 
                        id="selectAll"
                        checked={selectedImages.length === result.sampleData.unusedImages.length && selectedImages.length > 0}
                        onCheckedChange={toggleAllImages}
                      />
                      <label htmlFor="selectAll" className="text-sm font-medium">
                        Alle auswählen ({result.sampleData.unusedImages.length})
                      </label>
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="ml-auto"
                        onClick={deleteSelectedImages}
                        disabled={deleting || selectedImages.length === 0}
                      >
                        {deleting ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Läuft...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {selectedImages.length} Bilder löschen
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {deleteResult && (
                      <Alert className="mb-4" variant={deleteResult.success ? "default" : "destructive"}>
                        {deleteResult.success 
                          ? <CheckCircle2 className="h-4 w-4" /> 
                          : <AlertTriangle className="h-4 w-4" />}
                        <AlertTitle>
                          {deleteResult.success ? "Erfolgreich" : "Fehler"}
                        </AlertTitle>
                        <AlertDescription>
                          {deleteResult.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      {result.sampleData.unusedImages.map((url, index) => (
                        <div 
                          key={index} 
                          className="flex items-center p-2 rounded-md hover:bg-gray-50"
                        >
                          <Checkbox 
                            id={`image-${index}`}
                            checked={selectedImages.includes(url)}
                            onCheckedChange={() => toggleImageSelection(url)}
                            className="mr-2"
                          />
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm truncate">{url}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center py-8 text-gray-500">
                    {result.simulateOnly 
                      ? 'In der Simulation wurden keine ungenutzten Bilder gefunden.'
                      : 'Keine ungenutzten Bilder gefunden.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="lowRes">
            <Card>
              <CardHeader>
                <CardTitle>Bilder ohne Low-Resolution-Version</CardTitle>
                <CardDescription>
                  Für diese Bilder wurden Low-Resolution-Versionen erstellt oder wären zu erstellen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.sampleData?.imagesNeedingLowRes && result.sampleData.imagesNeedingLowRes.length > 0 ? (
                  <div className="space-y-2">
                    {result.sampleData.imagesNeedingLowRes.map((url, index) => (
                      <div 
                        key={index} 
                        className="flex items-center p-2 rounded-md hover:bg-gray-50"
                      >
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm truncate">{url}</p>
                          <p className="text-xs text-gray-500">
                            {result.simulateOnly 
                              ? 'Würde Low-Res-Version erstellen'
                              : 'Low-Res-Version wurde erstellt'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">
                    Alle Bilder haben bereits Low-Resolution-Versionen.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 