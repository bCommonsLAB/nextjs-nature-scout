"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Welcome } from "./Welcome";
import { Summary } from "./Summary";
import { UploadedImageList } from "./UploadedImageList";
import { HabitatAnalysis } from "./HabitatAnalysis";
import { SingleImageUpload } from "./SingleImageUpload";
import { Bild, NatureScoutData, AnalyseErgebnis, llmInfo, PlantNetResult } from "@/types/nature-scout";
import { LocationDetermination, isPolygonClosed } from './LocationDetermination';
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useNatureScoutState } from "@/context/nature-scout-context";
import { toast } from "sonner";

function calculatePolygonCenter(points: Array<[number, number]>): [number, number] {
  // Falls Polygon geschlossen ist (letzter Punkt = erster Punkt), den letzten Punkt nicht doppelt zählen.
  const hasDuplicateClosingPoint =
    points.length >= 2 &&
    points[0]?.[0] === points[points.length - 1]?.[0] &&
    points[0]?.[1] === points[points.length - 1]?.[1];

  const effectivePoints = hasDuplicateClosingPoint ? points.slice(0, -1) : points;

  if (effectivePoints.length === 0) {
    return [0, 0];
  }

  const sum = effectivePoints.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]] as [number, number],
    [0, 0] as [number, number]
  );

  return [sum[0] / effectivePoints.length, sum[1] / effectivePoints.length];
}

const schritte = [
  "Willkommen",
  "Standort finden", 
  "Umriss zeichnen",
  "Standortdaten ermitteln",
  "Panoramabild",
  "Detailbild", 
  "Pflanzenbild 1",
  "Pflanzenbild 2",
  "Habitat analysieren",
  "Verifizierung"
];

// Schritt-Erklärungen für die schwebende Sprechblase
const schrittErklaerungen = [
  {
    title: "Schritt für Schritt",
    description: "Gehen Sie ganz einfach jeden Schritt durch und beenden Sie ihn mit der Taste 'Weiter' am unteren Seitenende."
  },
  {
    title: "Standort finden",
    description: "Verschieben Sie den Kartenausschnitt zu Ihrem Habitat und zoomen Sie so weit wie möglich hinein, bis Sie das Habitat deutlich sehen können."
  },
  {
    title: "Umriss zeichnen",
    description: "Setzen Sie mindestens 3 Punkte und schließen Sie den Umriss, indem Sie den ersten Punkt erneut antippen. Danach: „Weiter“."
  },
  {
    title: "Standortdaten ermitteln",
    description: "Wir ermitteln jetzt die Standortdaten (Gemeinde, Flurname, Höhe, Hang, Exposition, Kataster). Danach: „Weiter“."
  },
  {
    title: "Panoramabild",
    description: "Legen Sie das Handy quer und erfassen Sie das gesamte Habitat mit einem Panoramabild. Halten Sie etwas Himmel mit ein für einen besseren Überblick."
  },
  {
    title: "Detailbild", 
    description: "Halten Sie das Handy aufrecht und machen Sie eine Nahaufnahme des Habitats. Fokussieren Sie auf interessante Details im Vordergrund, lassen aber etwas Hintergrund sichtbar."
  },
  {
    title: "Pflanzenbild 1",
    description: "Optional: Fotografieren Sie eine typische Pflanze des Habitats. Die Erkennung wird in der Regel genauer, wenn mindestens ein Pflanzenbild hochgeladen wird."
  },
  {
    title: "Pflanzenbild 2", 
    description: "Fotografieren Sie evtl. eine weitere typische Pflanze des Habitats. Wählen Sie eine andere Art als beim ersten Pflanzenbild für eine bessere Habitatcharakterisierung."
  },
  {
    title: "Habitat analysieren",
    description: "Die KI analysiert Ihre Bilder und Standortdaten, um den Habitattyp zu bestimmen. Pflanzenarten werden automatisch erkannt und bewertet. Sie können auch einen Kommentar hinzufügen."
  },
  {
    title: "Verifizierung",
    description: "Überprüfen Sie alle erfassten Daten und das Analyseergebnis. Sie können Änderungen vornehmen, bevor das Habitat gespeichert wird."
  }
];

// UX: Die Buttons unten heißen immer „Zurück“ / „Weiter“.
// Was genau passiert, erklären wir via Tooltip (title-Attribut) und via HelpBubble.

// Schwebende Sprechblasen-Komponente mit Overlay und automatischem Ausblenden
function FloatingHelpBubble({ 
  title, 
  description, 
  isVisible, 
  onClose,
  navigationHeight = 0,
  viewportHeight = 0
}: { 
  title: string; 
  description: string; 
  isVisible: boolean; 
  onClose: () => void;
  navigationHeight?: number;
  viewportHeight?: number;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Automatisches Ausblenden bei Klicks außerhalb des Dialogs
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // Prüfe, ob der Klick auf einen Navigation-Button (Zurück/Weiter) ist
      // Verwende data-navigation-button Attribut für zuverlässige Erkennung
      const clickedNavigationButton = target.closest('[data-navigation-button]');
      
      // WICHTIG: Navigation-Buttons komplett ignorieren - deren Click-Handler schließt den Dialog selbst
      // Der Event-Listener soll nur für Klicks außerhalb des Dialogs reagieren
      if (clickedNavigationButton) {
        return; // Event komplett ignorieren, Button-Handler läuft normal weiter
      }
      
      // Schließe nur, wenn der Klick außerhalb des Dialogs ist
      if (dialogRef.current && !dialogRef.current.contains(target)) {
        onClose();
      }
    };

    // Event-Listener hinzufügen (mit kleiner Verzögerung, damit der initiale Render nicht sofort schließt)
    // WICHTIG: NICHT im capture phase für Navigation-Buttons, damit deren Events zuerst laufen
    const timeoutId = setTimeout(() => {
      // Verwende bubble phase (false) statt capture phase, damit Button-Events zuerst laufen
      document.addEventListener('click', handleClickOutside, false);
      document.addEventListener('touchstart', handleClickOutside, false);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, false);
      document.removeEventListener('touchstart', handleClickOutside, false);
    };
  }, [isVisible, onClose]);

  // Animation beim Ein-/Ausblenden
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      return undefined;
    } else {
      // Kurze Verzögerung für Ausblend-Animation
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Automatisch nach 8 Sekunden ausblenden (Fallback)
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, onClose]);

  if (!isVisible && !isAnimating) return null;

  return (
    <div 
      ref={dialogRef}
      className={`fixed left-0 right-0 z-[9999] transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ 
        bottom: 0,
        paddingBottom: navigationHeight > 0 ? `${navigationHeight}px` : '0px',
      }}
    >
      {/* Dialog von unten einblendend (gleiches Design wie Standortdaten-Info) */}
      <div className="bg-gray-800/50 backdrop-blur-sm mx-auto max-w-2xl">
        {/* Inhalt */}
        <div className="px-6 py-3">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">
              {title}
            </h3>
            <p className="text-xs text-gray-200 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function isNextButtonDisabled(args: {
  schritt: number;
  metadata: NatureScoutData;
  isAnyUploadActive: boolean;
  canFinalizePolygon: boolean;
  isLocationDataLoading: boolean;
  isLocationDataReady: boolean;
  isExpert?: boolean;
}): boolean {
  const {
    schritt,
    metadata,
    isAnyUploadActive,
    canFinalizePolygon,
    isLocationDataLoading,
    isLocationDataReady
  } = args;

  // Schritt 9 (Verifizierung) ist nicht der letzte Schritt für Experten - Button bleibt aktiv
  // Nur wenn der Benutzer kein Experte ist, wird Schritt 8 zum letzten Schritt
  // (wird im onClick-Handler behandelt)
  if (isAnyUploadActive) return true;
  
  // Schritt 9 (Verifizierung) ist für Experten aktiv, für Nicht-Experten wird er nie erreicht
  if (schritt === 9) return false;

  switch (schritt) {
    case 0: // Willkommen
      return false;

    case 1: // Standort finden
      return false;

    case 2: // Umriss zeichnen
      // „Weiter“ bedeutet hier: Umriss speichern
      return !canFinalizePolygon;

    case 3: // Standortdaten ermitteln
      // „Weiter“ erst aktiv, wenn Daten fertig geladen
      return isLocationDataLoading || !isLocationDataReady;

    case 4: { // Panoramabild
      const hasPanorama = metadata.bilder.some(b => b.imageKey === "Panoramabild");
      return !hasPanorama;
    }

    case 5: { // Detailbild
      const hasDetail = metadata.bilder.some(b => b.imageKey === "Detailansicht");
      return !hasDetail;
    }

    case 6: { // Pflanzenbild 1
      // Optional: Weiter ist auch ohne erstes Pflanzenbild erlaubt.
      return false;
    }

    case 7: // Pflanzenbild 2
      return false;

    case 8: // Habitat analysieren
      return !metadata.analyseErgebnis || !metadata.llmInfo;

    default:
      return false;
  }
}

export default function NatureScout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editJobId = searchParams.get('editJobId');
  const [aktiverSchritt, setAktiverSchritt] = useState(0);
  const [metadata, setMetadata] = useState<NatureScoutData>({
    erfassungsperson: "",
    organizationId: "",
    organizationName: "",
    organizationLogo: "",
    email: "",
    gemeinde: "",
    flurname: "",
    latitude: 0,
    longitude: 0,
    standort: "",
    bilder: [],
    analyseErgebnis: undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [shouldScrollToNext, setShouldScrollToNext] = useState(false);
  const [isAnyUploadActive, setIsAnyUploadActive] = useState(false);
  const [showHelpBubble, setShowHelpBubble] = useState(true); // State für die Sprechblase
  const [showPlantImageOptionalDialog, setShowPlantImageOptionalDialog] = useState(false);

  // UX-State für den Umriss-Schritt (nur für Navigation/Tooltips, NICHT persistiert)
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<Array<[number, number]>>([]);
  const [isLocationDataLoading, setIsLocationDataLoading] = useState(false);
  const [isLocationDataReady, setIsLocationDataReady] = useState(false);
  
  // Experten-Status für Zugriff auf Verifizierung
  const [isExpert, setIsExpert] = useState<boolean>(false);
  
  // Experten-Status prüfen
  useEffect(() => {
    async function checkExpertStatus() {
      try {
        const expertResponse = await fetch('/api/users/isExpert');
        const expertData = await expertResponse.json();
        setIsExpert(expertData.isExpert || false);
      } catch (error) {
        console.error('Fehler beim Überprüfen des Experten-Status:', error);
        setIsExpert(false);
      }
    }
    
    checkExpertStatus();
  }, []);

  // Umriss ist „finalisierbar“, wenn er geschlossen und mindestens 3 Punkte hat.
  // Quelle: persistente Punkte (CREATED) oder Draft-Punkte (während Zeichnen).
  const pointsForPolygonGate = draftPolygonPoints.length > 0 ? draftPolygonPoints : (metadata.polygonPoints || []);
  const canFinalizePolygon = (() => {
    if (!pointsForPolygonGate || pointsForPolygonGate.length < 3) return false;
    return isPolygonClosed(pointsForPolygonGate);
  })();

  // Tooltip-Texte für die Bottom-Navigation (kurz und eindeutig)
  const nextTooltip = (() => {
    switch (aktiverSchritt) {
      case 0:
        return "Weiter: Standort finden";
      case 1:
        return "Weiter: Umriss zeichnen";
      case 2:
        if (!pointsForPolygonGate || pointsForPolygonGate.length === 0) return "Weiter ist gesperrt: zuerst Punkte setzen";
        if (pointsForPolygonGate.length < 3) return "Weiter ist gesperrt: mindestens 3 Punkte setzen";
        if (!isPolygonClosed(pointsForPolygonGate)) return "Weiter ist gesperrt: Umriss schließen (ersten Punkt antippen)";
        return "Weiter: Umriss speichern";
      case 3:
        return isLocationDataLoading ? "Standortdaten werden geladen..." : "Weiter: Bilder erfassen";
      case 4:
        return "Weiter: Detailbild erfassen";
      case 9:
        return "Neues Habitat erfassen";
      case 5:
        return "Weiter: Pflanzenbild 1 erfassen";
      case 6:
        return "Weiter: Pflanzenbild 2 erfassen (ohne Pflanzenbild 1 möglich)";
      case 7:
        return "Weiter: zur Analyse";
      case 8:
        return "Weiter: Habitat speichern";
      case 9:
        return "Fertig";
      default:
        return "Weiter";
    }
  })();

  const backTooltip = (() => {
    switch (aktiverSchritt) {
      case 0:
        return "Zurück zur Startseite";
      case 2:
        // Wenn schon begonnen, bedeutet „Zurück“: neu zeichnen (statt Schrittwechsel)
        if (draftPolygonPoints.length > 0) return "Zurück: Umriss verwerfen und neu zeichnen";
        return "Zurück: Standort finden";
      case 3:
        return "Zurück: Umriss zeichnen";
      default:
        return "Zurück";
    }
  })();

  // Tooltip: funktioniert auch für disabled Buttons nur über Wrapper (span).
  function ButtonWithTooltip({
    tooltip,
    children
  }: {
    tooltip: string;
    children: React.ReactNode;
  }) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex" tabIndex={0}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="max-w-[260px] text-sm leading-snug">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  // Refs für dynamische Höhenberechnung
  const progressBarRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const [navigationHeight, setNavigationHeight] = useState(0);
  const [helpBubbleHeight, setHelpBubbleHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Sprechblase bei Schrittwechsel anzeigen
  useEffect(() => {
    // Für "Standortdaten ermitteln" ist die Sprechblase redundant/störend (die Statusanzeige passiert im Standort-Panel).
    if (aktiverSchritt === 3) {
      setShowHelpBubble(false);
      return;
    }
    setShowHelpBubble(true);
  }, [aktiverSchritt]);

  // Wenn der Nutzer zurück zu "Standort finden" geht (Standort ändern),
  // müssen Standortinformationen verworfen werden, damit sie später neu berechnet werden.
  useEffect(() => {
    if (aktiverSchritt !== 1) return;

    const hasLocationInfo = Boolean(
      metadata.gemeinde ||
      metadata.flurname ||
      metadata.standort ||
      metadata.elevation ||
      metadata.exposition ||
      metadata.slope ||
      metadata.kataster
    );

    if (!hasLocationInfo) return;

    setIsLocationDataReady(false);

    setMetadata(prev => ({
      ...prev,
      // Nur Standort-bezogene Felder löschen
      gemeinde: "",
      flurname: "",
      standort: "",
      elevation: undefined,
      exposition: undefined,
      slope: undefined,
      kataster: undefined
    }));
  }, [aktiverSchritt, metadata.gemeinde, metadata.flurname, metadata.standort, metadata.elevation, metadata.exposition, metadata.slope, metadata.kataster, setMetadata]);

  // Dynamische Höhenberechnung
  useEffect(() => {
    const updateHeights = () => {
      // Viewport-Höhe
      setViewportHeight(window.innerHeight);
      
      // Navigation-Höhe dynamisch messen
      if (navigationRef.current) {
        const height = navigationRef.current.offsetHeight;
        setNavigationHeight(height);
      } else {
        setNavigationHeight(80); // Fallback
      }
      
      // HelpBubble-Höhe (geschätzt, da sie noch nicht gerendert ist)
      setHelpBubbleHeight(120); // Ungefähre Höhe der Sprechblase
    };

    // Initial berechnen
    updateHeights();
    
    // Bei Resize neu berechnen
    window.addEventListener('resize', updateHeights);
    
    // MutationObserver für dynamische Navigation-Höhe
    const observer = new MutationObserver(updateHeights);
    if (navigationRef.current) {
      observer.observe(navigationRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
    
    return () => {
      window.removeEventListener('resize', updateHeights);
      observer.disconnect();
    };
  }, [aktiverSchritt]); // Bei Schrittwechsel neu berechnen

  // Scrolle zur Progressbar, wenn sich der aktive Schritt ändert
  useEffect(() => {
    if (progressBarRef.current) {
      // Verzögerung hinzufügen, damit das Layout vollständig gerendert ist
      setTimeout(() => {
        // Berechne Position mit etwas Offset nach oben (für bessere Sichtbarkeit)
        const yOffset = -20; // 20px Offset nach oben
        const yPosition = progressBarRef.current!.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        // Sanftes Scrollen zur Progressbar
        window.scrollTo({
          top: yPosition,
          behavior: 'smooth'
        });
      }, 100); // 100ms Verzögerung
    }
  }, [aktiverSchritt]);

  // Zusätzlicher Effekt für initiales Laden
  useEffect(() => {
    // Wenn die Seite direkt mit einem bestimmten Schritt geladen wird
    if (aktiverSchritt > 0) {
      setTimeout(() => {
        // Scrolle zum Anfang der Seite, damit Navigation sichtbar ist
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 200);
    }
  }, []); // Nur beim ersten Laden

  // Laden von vorhandenen Habitatdaten, wenn editJobId vorhanden ist
  useEffect(() => {
    if (editJobId) {
      const fetchHabitatData = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/habitat/${editJobId}`);
          
          if (!response.ok) {
            throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
          }
          
          const habitatData = await response.json();
          
          // Setze die geladenen Daten in den State
          if (habitatData && habitatData.metadata) {
            
            // Extrahiere polygonPoints aus points oder polygonPoints
            const polygonPoints = habitatData.metadata.polygonPoints || 
                                  habitatData.metadata.points || 
                                  [];
            
            setMetadata({
              erfassungsperson: habitatData.metadata.erfassungsperson || "",
              organizationId: habitatData.metadata.organizationId || "",
              organizationName: habitatData.metadata.organizationName || "",
              organizationLogo: habitatData.metadata.organizationLogo || "",
              email: habitatData.metadata.email || "",
              gemeinde: habitatData.metadata.gemeinde || "",
              flurname: habitatData.metadata.flurname || "",
              latitude: habitatData.metadata.latitude || 0,
              longitude: habitatData.metadata.longitude || 0,
              standort: habitatData.metadata.standort || "",
              bilder: habitatData.metadata.bilder?.map((bild: Bild) => ({
                imageKey: bild.imageKey || (bild.plantnetResult ? "Detailbild_1" : "Panoramabild"),
                filename: bild.filename || "Bild.jpg",
                url: bild.url,
                analyse: bild.analyse || "",
                plantnetResult: bild.plantnetResult
              })) || [],
              analyseErgebnis: habitatData.result || undefined,
              llmInfo: habitatData.llmInfo || undefined,
              kommentar: habitatData.metadata.kommentar || "",
              
              // Wichtig: Polygonpunkte setzen
              polygonPoints: polygonPoints,
              
              // Weitere Felder, die möglicherweise in den Metadaten vorhanden sind
              exposition: habitatData.metadata.exposition || "",
              elevation: habitatData.metadata.elevation || "",
              slope: habitatData.metadata.slope || "",
              plotsize: habitatData.metadata.plotsize || 0,
              kataster: habitatData.metadata.kataster || undefined
            });
            
            // Direkt zum zweiten Schritt springen, wenn wir ein bestehendes Habitat bearbeiten
            setAktiverSchritt(1);
          }
        } catch (error) {
          console.error("Fehler beim Laden der Habitat-Daten:", error);
          alert(`Fehler beim Laden der Habitat-Daten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchHabitatData();
    }
  }, [editJobId]);

  // Metadaten in den Context übertragen
  const { setMetadata: setContextMetadata, setEditJobId: setContextEditJobId } = useNatureScoutState();

  // useEffect zum Aktualisieren des Contexts
  useEffect(() => {
    setContextMetadata(metadata);
    if (editJobId) {
      setContextEditJobId(editJobId);
    }
  }, [metadata, editJobId, setContextMetadata, setContextEditJobId]);

  // Handler für den Upload-Status aus der UploadImages-Komponente
  const handleUploadActiveChange = (isActive: boolean) => {
    setIsAnyUploadActive(isActive);
  };

  const handleAnalysisComplete = (
    ergebnis: AnalyseErgebnis, 
    llmInfo: llmInfo
  ) => {
    setMetadata(prev => ({
      ...prev,
      analyseErgebnis: ergebnis,
      llmInfo
    }));
  };

  const handleKommentarChange = (kommentar: string) => {
    setMetadata(prev => ({
      ...prev,
      kommentar
    }));
  };

  // Handler für "Neuen Habitat erfassen" - setzt alles zurück für einen neuen Habitat
  const handleNeuerHabitat = () => {
    // Metadaten auf Anfangswerte zurücksetzen
    setMetadata({
      erfassungsperson: "",
      organizationId: "",
      organizationName: "",
      organizationLogo: "",
      email: "",
      gemeinde: "",
      flurname: "",
      latitude: 0,
      longitude: 0,
      standort: "",
      bilder: [],
      analyseErgebnis: undefined
    });
    
    // Zum ersten Schritt zurückkehren
    setAktiverSchritt(0);
    
    // Upload-Status zurücksetzen
    setIsAnyUploadActive(false);
    
    // Hilfe-Sprechblase wieder anzeigen
    setShowHelpBubble(true);
    
    // Erfolgs-Toast anzeigen
    toast.success('Bereit für einen neuen Habitat! 🌱', {
      description: 'Alle Daten wurden zurückgesetzt. Sie können jetzt einen weiteren Habitat erfassen.'
    });
  };

  // Debug-Funktion zum direkten Springen zum Bilder-Upload-Schritt
  const skipToImagesUpload = useCallback(() => {
    // Für Debug-Zwecke fülle eine minimale Konfiguration der Standortdaten aus
    setMetadata(prev => ({
      ...prev,
      gemeinde: prev.gemeinde || "Debug-Gemeinde",
      flurname: prev.flurname || "Debug-Flurname",
      latitude: prev.latitude || 47.123456,
      longitude: prev.longitude || 11.123456,
      standort: prev.standort || "Debug-Standort"
    }));

    // Direkt zu Schritt 3 springen (Panoramabild)
    setAktiverSchritt(3);
  }, []);

  // Funktion zum Scrollen zum Weiter-Button
  const scrollToNext = useCallback(() => {
    setShouldScrollToNext(true);
  }, []);

  // Beim Eintritt in den Schritt "Standortdaten ermitteln" triggern wir die Geodaten-Abfrage.
  // (Das passiert bewusst NICHT beim Polygon-Speichern, damit der Flow sauber getrennt ist.)
  // Reagiert auch auf Änderungen von polygonPoints, damit bei Verschieben von Punkten neu berechnet wird.
  useEffect(() => {
    let isCancelled = false;

    async function run() {
      if (aktiverSchritt !== 3) return;

      // Mittelpunkt aus aktuellen Polygon-Punkten berechnen
      // (falls sich das Polygon geändert hat, z.B. durch Verschieben von Punkten)
      const polygonPoints = metadata.polygonPoints || [];
      let lat: number;
      let lon: number;

      if (polygonPoints.length >= 3) {
        [lat, lon] = calculatePolygonCenter(polygonPoints);
        // Koordinaten aktualisieren, falls sie sich geändert haben
        setMetadata(prev => {
          if (prev.latitude !== lat || prev.longitude !== lon) {
            return {
              ...prev,
              latitude: lat,
              longitude: lon
            };
          }
          return prev;
        });
      } else {
        // Fallback auf gespeicherte Koordinaten, falls kein Polygon vorhanden
        lat = metadata.latitude;
        lon = metadata.longitude;
      }

      // Ohne gültige Koordinaten macht ein Geobrowser-Call keinen Sinn.
      if (!lat || !lon || lat === 0 || lon === 0) {
        setIsLocationDataReady(false);
        return;
      }

      // Jedes Mal neu berechnen, wenn wir in diesen Schritt wechseln
      // (auch wenn bereits Daten vorhanden sind, da sich das Polygon geändert haben könnte)
      setIsLocationDataLoading(true);
      setIsLocationDataReady(false);

      try {
        const url = `/api/geobrowser?lat=${lat}&lon=${lon}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Geo-API Fehler: ${res.status}`);
        const data = await res.json();

        if (isCancelled) return;

        // Vor dem Setzen sicherstellen, dass alte Daten überschrieben werden
        setMetadata(prev => ({
          ...prev,
          standort: data.standort || 'Standort konnte nicht ermittelt werden',
          gemeinde: data.gemeinde || 'unbekannt',
          flurname: data.flurname || 'unbekannt',
          elevation: data.elevation || 'unbekannt',
          exposition: data.exposition || 'unbekannt',
          slope: data.slope || 'unbekannt',
          kataster: data.kataster
        }));

        setIsLocationDataReady(true);
      } catch (e) {
        // Wichtig: Wir blockieren Nutzer nicht dauerhaft.
        // Bei Fehler markieren wir den Schritt als „fertig“, aber setzen Platzhalterwerte.
        if (isCancelled) return;

        setMetadata(prev => ({
          ...prev,
          standort: prev.standort || 'Standort konnte nicht ermittelt werden',
          gemeinde: prev.gemeinde || 'unbekannt',
          flurname: prev.flurname || 'unbekannt'
        }));
        setIsLocationDataReady(true);
      } finally {
        if (!isCancelled) setIsLocationDataLoading(false);
      }
    }

    run();
    return () => {
      isCancelled = true;
    };
  }, [aktiverSchritt, metadata.polygonPoints, metadata.latitude, metadata.longitude, metadata.gemeinde, metadata.flurname, metadata.standort, setMetadata]);

  // Effekt für das Scrollen zum Weiter-Button
  useEffect(() => {
    if (shouldScrollToNext && nextButtonRef.current) {
      const buttonPosition = nextButtonRef.current.getBoundingClientRect();
      
      // Prüfen, ob der Button bereits sichtbar ist
      const isVisible = 
        buttonPosition.top >= 0 &&
        buttonPosition.left >= 0 &&
        buttonPosition.bottom <= window.innerHeight &&
        buttonPosition.right <= window.innerWidth;
      
      // Nur scrollen, wenn der Button nicht sichtbar ist
      if (!isVisible) {
        // Neue Scroll-Position berechnen, damit der Button gerade am unteren Rand sichtbar wird
        // Wir nehmen die absolute Position des Buttons (pageYOffset + top)
        // und ziehen die Viewport-Höhe ab, fügen aber die Button-Höhe hinzu
        // plus etwas Abstand (20px)
        const yPosition = (buttonPosition.top + window.pageYOffset) - window.innerHeight + buttonPosition.height + 20;
        
        // Sanftes Scrollen zum Weiter-Button
        window.scrollTo({
          top: yPosition,
          behavior: 'smooth'
        });
      }
      
      // State zurücksetzen, um weitere Scrollaufrufe zu ermöglichen
      setShouldScrollToNext(false);
    }
  }, [shouldScrollToNext]);

  const renderSchrittInhalt = (schritt: number) => {
    switch (schritt) {
      case 0:
        return <Welcome 
          metadata={metadata} 
          setMetadata={setMetadata} 
          scrollToNext={scrollToNext}
          onSkipToImages={skipToImagesUpload}
        />;
      case 4: // Panoramabild
        return <SingleImageUpload 
          metadata={metadata} 
          setMetadata={setMetadata} 
          imageKey="Panoramabild"
          title="Panoramabild"
          instruction="Gesamtüberblick des Habitats"
          doAnalyzePlant={false}
          schematicBg="/images/schema-panorama.svg"
          onUploadActiveChange={handleUploadActiveChange}
          requiredOrientation="landscape"
        />;
      case 5: // Detailbild
        return <SingleImageUpload 
          metadata={metadata} 
          setMetadata={setMetadata} 
          imageKey="Detailansicht"
          title="Detailbild"
          instruction="Nahaufnahme mit Hintergrund"
          doAnalyzePlant={false}
          schematicBg="/images/schema-detail.svg"
          onUploadActiveChange={handleUploadActiveChange}
          requiredOrientation="portrait"
        />;
      case 6: // Pflanzenbild 1
        return <SingleImageUpload 
          metadata={metadata} 
          setMetadata={setMetadata} 
          imageKey="Detailbild_1"
          title="Pflanzenbild 1"
          instruction="Erste typische Pflanzenart (optional)"
          doAnalyzePlant={true}
          schematicBg="/images/schema-plant1.svg"
          onUploadActiveChange={handleUploadActiveChange}
          requiredOrientation="portrait"
        />;
      case 7: // Pflanzenbild 2
        return <SingleImageUpload 
          metadata={metadata} 
          setMetadata={setMetadata} 
          imageKey="Detailbild_2"
          title="Pflanzenbild 2"
          instruction="Zweite typische Pflanzenart (optional)"
          doAnalyzePlant={true}
          schematicBg="/images/schema-plant2.svg"
          onUploadActiveChange={handleUploadActiveChange}
          requiredOrientation="portrait"
        />;
      case 8: // Habitat analysieren
        return (
          <div className="space-y-4">
            <div>
              <UploadedImageList bilder={metadata.bilder} />
            </div>
            <div>
              <HabitatAnalysis 
                metadata={metadata} 
                onAnalysisComplete={handleAnalysisComplete}
                onKommentarChange={handleKommentarChange}
              />
            </div>
          </div>
        );
      case 9: // Verifizierung
        return (
          <>
            <Summary 
              metadata={metadata}
            />
          </>
        );
      default:
        return null; // Für Schritte 1-3 wird LocationDetermination separat gerendert
    }
  };

  return (
    <>
      <div className="container mx-auto p-4 min-h-screen flex flex-col">
        <div className="mb-2" ref={progressBarRef}>
          <Progress value={(aktiverSchritt / (schritte.length - 1)) * 100} className="w-full" />
          <div className="flex justify-between mt-1 px-1">
            {schritte.map((label, index) => (
              <span 
                key={label} 
                className={`
                  text-center 
                  ${index === aktiverSchritt ? "font-bold" : ""}
                `}
                title={label} // Tooltip für mobile Nummern
              >
                {/* Desktop: Volltext für alle Schritte */}
                <span className="hidden md:inline text-sm">
                  {label}
                </span>
                
                {/* Mobile: Aktiver Schritt als Text, andere als Nummern */}
                <span className="md:hidden text-xs">
                  {index === aktiverSchritt ? (
                    <span className="font-bold">{label}</span>
                  ) : (
                    <span className="text-gray-500">{index + 1}</span>
                  )}
                </span>
              </span>
            ))}
          </div>
        </div>
        
        {/* Hauptinhalt - nimmt verfügbaren Platz ein, aber lässt Platz für Navigation */}
        <div className="flex-1 overflow-y-auto pb-32 sm:pb-24" style={{ paddingBottom: 'max(140px, 20vh)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-3">
              <Card>
                {editJobId ? (
                  <CardHeader>
                    <CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span>Bearbeitung von Habitat</span>
                        <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded">
                          Job-ID: {editJobId}
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  ) : (
                    aktiverSchritt !== 1 && aktiverSchritt !== 2 && aktiverSchritt !== 3 && aktiverSchritt !== 4 && aktiverSchritt !== 5 ? (
                      <CardHeader>
                        <CardTitle>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span>{schritte[aktiverSchritt]}</span>
                          </div>
                      </CardTitle>
                    </CardHeader>
                    ) : null
                  )}
                
        {/* Persistente LocationDetermination für Schritte 1, 2 und 3 */}
        {(aktiverSchritt === 1 || aktiverSchritt === 2 || aktiverSchritt === 3) ? (
                  <div className="p-0">
                    {isLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <LocationDetermination 
                        key="persistent-location-determination" // Feste Key für persistence
                        metadata={metadata} 
                        setMetadata={setMetadata} 
                        scrollToNext={scrollToNext}
                mapMode={aktiverSchritt === 2 ? 'polygon' : 'navigation'}
                onPolygonDraftChange={setDraftPolygonPoints}
                isLocationDataLoading={aktiverSchritt === 3 ? isLocationDataLoading : false}
                forceShowLocationInfo={aktiverSchritt === 3}
                      />
                    )}
                  </div>
                ) : (
                  <div className="p-0">
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      renderSchrittInhalt(aktiverSchritt)
                    )}
                  </CardContent>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation - außerhalb des main Containers, immer unten, fixed position */}
      <div 
        ref={navigationRef}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm py-2 sm:py-2 px-1 border-t border-gray-200 shadow-lg"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          width: '100%',
          minHeight: '55px',
          paddingBottom: 'env(safe-area-inset-bottom, 6px)'
        }}
      >
        <TooltipProvider>
          <div className="container mx-auto flex justify-between items-center">
            <ButtonWithTooltip tooltip={backTooltip}>
              <Button 
                data-navigation-button="back"
                onClick={() => {
                  // Dialog schließen als Side-Effekt, bevor der Schritt wechselt
                  setShowHelpBubble(false);
                  
                  if (aktiverSchritt === 0) {
                    router.push('/');
                    return;
                  }

                  if (aktiverSchritt === 2) {
                    // Spezialfall: Umriss zeichnen
                    if (draftPolygonPoints.length > 0) {
                      // „Zurück" bedeutet: Neu zeichnen (während des Zeichnens)
                      setDraftPolygonPoints([]);
                      setMetadata(prev => ({
                        ...prev,
                        polygonPoints: [],
                        latitude: 0,
                        longitude: 0,
                        gemeinde: "",
                        flurname: "",
                        standort: ""
                      }));
                      return;
                    }

                    // Noch nicht begonnen -> zurück zu Standort finden
                    setAktiverSchritt(1);
                    return;
                  }

                  if (aktiverSchritt === 3) {
                    // Standortdaten ermitteln -> zurück zu Umriss zeichnen
                    setAktiverSchritt(2);
                    return;
                  }

                  setAktiverSchritt(prev => prev - 1);
                }} 
                disabled={aktiverSchritt === 0 && false}
                variant="outline"
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Zurück
              </Button>
            </ButtonWithTooltip>

            <ButtonWithTooltip tooltip={nextTooltip}>
              <Button 
                ref={nextButtonRef}
                data-navigation-button="next"
                onClick={() => {
                  // Dialog schließen als Side-Effekt, bevor der Schritt wechselt
                  setShowHelpBubble(false);
                  
                  // Explizite Behandlung für Schritt 0 (Willkommen) - direkt zu Schritt 1
                  if (aktiverSchritt === 0) {
                    setAktiverSchritt(1);
                    return;
                  }

                  if (aktiverSchritt === 8) {
                    // Alle Benutzer (Experten und Nicht-Experten) werden zum Summary-Schritt weitergeleitet
                    setAktiverSchritt(9);
                    return;
                  }
                  
                  if (aktiverSchritt === 9) {
                    // Im Summary/Verifizierungs-Schritt: 
                    // Nach dem Anzeigen des Summary zurück zum ersten Schritt
                    // (Für Experten wird die Verifizierung im Summary-Dialog selbst behandelt)
                    handleNeuerHabitat();
                    return;
                  }

                  if (aktiverSchritt === 2) {
                    // „Weiter" bedeutet hier: Umriss speichern, danach zum Standortdaten-Schritt
                    const points = (metadata.polygonPoints || []);
                    if (points.length < 3 || !isPolygonClosed(points)) return;

                    // Speichern (minimal): Mittelpunkt in Metadaten schreiben (für Geobrowser im nächsten Schritt).
                    const [centerLat, centerLng] = calculatePolygonCenter(points);
                    setMetadata(prev => ({
                      ...prev,
                      latitude: centerLat,
                      longitude: centerLng
                    }));

                    setIsLocationDataReady(false);
                    setAktiverSchritt(3);
                    return;
                  }

                  if (aktiverSchritt === 3) {
                    setAktiverSchritt(4);
                    return;
                  }

                  if (aktiverSchritt === 6) {
                    const hasPlant1 = metadata.bilder.some(b => b.imageKey === "Detailbild_1");
                    if (!hasPlant1) {
                      setShowPlantImageOptionalDialog(true);
                      return;
                    }
                  }

                  setAktiverSchritt(prev => prev + 1);
                }} 
                disabled={isNextButtonDisabled({
                  schritt: aktiverSchritt,
                  metadata,
                  isAnyUploadActive,
                  canFinalizePolygon,
                  isLocationDataLoading,
                  isLocationDataReady,
                  isExpert
                })}
                className="gap-1"
              >
                {aktiverSchritt === 9 ? "Neues Habitat erfassen" : "Weiter"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </ButtonWithTooltip>
          </div>
        </TooltipProvider>
      </div>
      
      {/* Schwebende Sprechblase */}
      {aktiverSchritt >= 0 && (
        <FloatingHelpBubble 
          title={schrittErklaerungen[aktiverSchritt]?.title || "Schritt"}
          description={schrittErklaerungen[aktiverSchritt]?.description || "Beschreibung wird geladen..."}
          isVisible={showHelpBubble}
          onClose={() => setShowHelpBubble(false)}
          navigationHeight={navigationHeight}
          viewportHeight={viewportHeight}
        />
      )}

      <Dialog open={showPlantImageOptionalDialog} onOpenChange={setShowPlantImageOptionalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pflanzenbild 1 überspringen?</DialogTitle>
            <DialogDescription>
              Ohne Pflanzenbild kann die Habitat-Erkennung ungenauer sein. Möchtest du trotzdem fortfahren?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPlantImageOptionalDialog(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                setShowPlantImageOptionalDialog(false);
                setAktiverSchritt(prev => prev + 1);
              }}
            >
              Weiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 