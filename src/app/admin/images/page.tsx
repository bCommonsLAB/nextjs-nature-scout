"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, RotateCw, Image, RefreshCw, X, Save, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ImageItem {
  url: string;
  lowResUrl: string;
  filename: string;
  lowResFilename: string;
  size: number;
  lowResSize: number;
  lastModified: string;
  rotation: number; // 0, 90, 180, 270
}

interface ImageGalleryResult {
  success: boolean;
  images: ImageItem[];
  totalCount: number;
  message: string;
}

interface RotateResult {
  success: boolean;
  message: string;
}

export default function ImageGalleryPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageGalleryResult | null>(null);
  const [rotateResult, setRotateResult] = useState<RotateResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Modal-Zustand für Bildbearbeitung
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(Date.now()); // Cache-Busting
  
  // Lade Bilder beim ersten Laden der Seite
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Lade Bild-Galerie...');
      
      const response = await fetch('/api/admin/images');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP Fehler: ${response.status} - ${errorText}`);
        throw new Error(`HTTP Fehler! Status: ${response.status}, Antwort: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Galerie-Ergebnis:", data);
      setResult(data);
      setCacheBuster(Date.now()); // Cache-Buster aktualisieren
    } catch (e) {
      console.error("Fehler beim Laden der Bilder:", e);
      setError(`Fehler beim Laden der Bilder: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const openImageEditor = (image: ImageItem) => {
    setSelectedImage(image);
    setCurrentRotation(0); // Starte mit 0° Rotation
    setIsModalOpen(true);
  };
  
  const rotateImage = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setCurrentRotation((prev) => (prev - 90) % 360);
    } else {
      setCurrentRotation((prev) => (prev + 90) % 360);
    }
  };
  
  const saveImage = async () => {
    if (!selectedImage || currentRotation === 0) {
      setIsModalOpen(false);
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      console.log(`Speichere Rotation für ${selectedImage.filename} um ${currentRotation}°`);
      
      const response = await fetch('/api/admin/images/rotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: selectedImage.url,
          rotationAngle: currentRotation
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP Fehler: ${response.status} - ${errorText}`);
        throw new Error(`HTTP Fehler! Status: ${response.status}, Antwort: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Rotationsergebnis:", data);
      setRotateResult(data);
      
      // Bei Erfolg die Bilder neu laden und Modal schließen
      if (data.success) {
        setCacheBuster(Date.now()); // Sofort Cache-Buster aktualisieren
        await loadImages();
        setIsModalOpen(false);
        setSelectedImage(null);
        setCurrentRotation(0);
      }
    } catch (e) {
      console.error("Fehler beim Speichern:", e);
      setError(`Fehler beim Speichern: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // Filtere und sortiere Bilder
  const filteredAndSortedImages = result?.images
    ?.filter(img => 
      img.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.lowResFilename.toLowerCase().includes(searchTerm.toLowerCase())
    )
    ?.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.filename.localeCompare(b.filename);
          break;
        case "date":
          comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
        case "size":
          comparison = a.size - b.size;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    }) || [];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };
  
  // Cache-Busting URL generieren
  const getCacheBustedUrl = (url: string) => {
    return `${url}?t=${cacheBuster}`;
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bild-Galerie</h1>
          <p className="text-gray-500 mt-1">Verwalte und repariere Bilder im Azure Storage</p>
        </div>
        <Button onClick={loadImages} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>
      
      {/* Such- und Filteroptionen */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Suche</Label>
              <Input
                id="search"
                placeholder="Dateiname suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sortBy">Sortieren nach</Label>
              <Select value={sortBy} onValueChange={(value: "name" | "date" | "size") => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Datum</SelectItem>
                  <SelectItem value="size">Größe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sortOrder">Reihenfolge</Label>
              <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Aufsteigend</SelectItem>
                  <SelectItem value="desc">Absteigend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="viewMode">Ansicht</Label>
              <Select value={viewMode} onValueChange={(value: "grid" | "list") => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Raster</SelectItem>
                  <SelectItem value="list">Liste</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {rotateResult && (
        <Alert className="mb-6" variant={rotateResult.success ? "default" : "destructive"}>
          {rotateResult.success 
            ? <CheckCircle2 className="h-4 w-4" /> 
            : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>
            {rotateResult.success ? "Erfolgreich gespeichert" : "Fehler beim Speichern"}
          </AlertTitle>
          <AlertDescription>
            {rotateResult.message}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Lade Bilder...</span>
            </div>
          </CardContent>
        </Card>
      ) : result ? (
        <div>
          {/* Statistiken */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{result.totalCount}</p>
                  <p className="text-sm text-gray-500">Bilder insgesamt</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{filteredAndSortedImages.length}</p>
                  <p className="text-sm text-gray-500">Angezeigt</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{result.totalCount * 2}</p>
                  <p className="text-sm text-gray-500">Dateien (inkl. Low-Res)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bildergalerie */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAndSortedImages.map((image, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-105"
                  onClick={() => openImageEditor(image)}
                >
                  <CardContent className="p-4">
                    <div className="relative">
                      <img
                        src={getCacheBustedUrl(image.lowResUrl)}
                        alt={image.filename}
                        className="w-full h-48 object-cover rounded-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/image-placeholder.jpg';
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {image.rotation}°
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium truncate">{image.filename}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(image.lowResSize)}</span>
                        <span>{formatDate(image.lastModified)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {filteredAndSortedImages.map((image, index) => (
                    <div 
                      key={index} 
                      className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => openImageEditor(image)}
                    >
                                              <img
                          src={getCacheBustedUrl(image.lowResUrl)}
                          alt={image.filename}
                          className="w-16 h-16 object-cover rounded mr-4"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/image-placeholder.jpg';
                          }}
                        />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{image.filename}</p>
                        <p className="text-xs text-gray-500 truncate">{image.lowResFilename}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>Original: {formatFileSize(image.size)}</span>
                          <span>Low-Res: {formatFileSize(image.lowResSize)}</span>
                          <span>{formatDate(image.lastModified)}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Rotation: {image.rotation}°
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {filteredAndSortedImages.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Keine Bilder gefunden.' : 'Keine Bilder verfügbar.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Klicken Sie auf "Aktualisieren" um Bilder zu laden.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bildbearbeitungs-Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Bild bearbeiten: {selectedImage?.filename}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              {/* Bildvorschau */}
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={getCacheBustedUrl(selectedImage.lowResUrl)}
                    alt={selectedImage.filename}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                    style={{
                      transform: `rotate(${currentRotation}deg)`,
                      transition: 'transform 0.3s ease'
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/image-placeholder.jpg';
                    }}
                  />
                </div>
              </div>
              
              {/* Rotations-Steuerung */}
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => rotateImage('left')}
                  disabled={saving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Links drehen
                </Button>
                
                <div className="text-center">
                  <p className="text-sm font-medium">Aktuelle Rotation</p>
                  <p className="text-2xl font-bold">{currentRotation}°</p>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => rotateImage('right')}
                  disabled={saving}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rechts drehen
                </Button>
              </div>
              
              {/* Aktions-Buttons */}
              <div className="flex items-center justify-center space-x-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Abbrechen
                </Button>
                
                <Button
                  onClick={saveImage}
                  disabled={saving || currentRotation === 0}
                  className="min-w-32"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Speichere...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Speichern
                    </>
                  )}
                </Button>
              </div>
              
              {/* Hinweis */}
              <div className="text-center text-sm text-gray-500">
                <p>Das Original- und Low-Res-Bild werden beide rotiert und gespeichert.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 