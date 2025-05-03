import { NextResponse } from 'next/server';
import { GeocodingResult } from '@/types/nature-scout';

// Erweitere GeocodingResult um Katasterinformationen
interface ExtendedGeocodingResult extends GeocodingResult {
  elevation: string;
  exposition: string;
  slope: string;
  kataster?: {
    parzellennummer?: string;
    flaeche?: number;
    katastralgemeinde?: string;
    katastralgemeindeKodex?: string;
    gemeinde?: string;
    istatKodex?: string;
  };
}

// Interface für Debug-Informationen
interface DebugInfo {
  urls: {
    exposition: string;
    slope: string;
    municipality: string;
    elevation: string;
    cadastre: string;
  };
  responses: {
    exposition: any;
    slope: any;
    municipality: any;
    elevation: any;
    cadastre: any;
  };
  parsedData: {
    exposition: any;
    slope: any;
    municipality: any;
    elevation: any;
    cadastre: any;
  };
}

// Verbesserte UTM-Transformation - genauere Approximation für Südtirol
function wgs84ToUtm32N(lat: number, lon: number): { easting: number, northing: number } {
  // Konstanten für ETRS89/UTM Zone 32N (EPSG:25832)
  const a = 6378137.0;  // Äquatorradius in Metern
  const e = 0.0818192;  // Exzentrizität der Ellipse
  const lon0Rad = 9.0 * Math.PI / 180.0;  // Zentralmeridian für Zone 32 in Radiant
  const latRad = lat * Math.PI / 180.0;
  const lonRad = lon * Math.PI / 180.0;
  const k0 = 0.9996;  // Skalierungsfaktor
  
  // Berechnungen
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const tanLat = Math.tan(latRad);
  const n = a / Math.sqrt(1 - e * e * sinLat * sinLat);
  const t = tanLat * tanLat;
  const c = e * e * cosLat * cosLat / (1 - e * e);
  const A = (lonRad - lon0Rad) * cosLat;
  
  // Easting (x-Koordinate)
  const easting = k0 * n * (A + (1 - t + c) * A * A * A / 6 + (5 - 18 * t + t * t + 72 * c - 58) * A * A * A * A * A / 120) + 500000;
  
  // Northing (y-Koordinate)
  const M = a * ((1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * e * e * e * e * e * e / 256) * latRad
                - (3 * e * e / 8 + 3 * e * e * e * e / 32 + 45 * e * e * e * e * e * e / 1024) * Math.sin(2 * latRad)
                + (15 * e * e * e * e / 256 + 45 * e * e * e * e * e * e / 1024) * Math.sin(4 * latRad)
                - (35 * e * e * e * e * e * e / 3072) * Math.sin(6 * latRad));
  
  const northing = k0 * (M + n * tanLat * (A * A / 2 + (5 - t + 9 * c + 4 * c * c) * A * A * A * A / 24 + (61 - 58 * t + t * t + 600 * c - 330) * A * A * A * A * A * A / 720));
  
  // Korrektur für Nordhabkugel
  return { easting, northing: northing };
}

// Hilfsfunktion zur Umwandlung von Grad in Himmelsrichtung
function degreesToDirection(degrees: number): string {
  // Grad zu Himmelsrichtungen umwandeln
  const directions = [
    "Nord", "Nordnordost", "Nordost", "Ostnordost",
    "Ost", "Ostsüdost", "Südost", "Südsüdost",
    "Süd", "Südsüdwest", "Südwest", "Westsüdwest",
    "West", "Westnordwest", "Nordwest", "Nordnordwest", "Nord"
  ];
  
  // Stellen sicher, dass der Index immer gültig ist
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index] || "Nord"; // Fallback zu Nord
}

// Berechnet BBOX und andere gemeinsame Parameter für WMS-Anfragen
function calculateBboxParams(easting: number, northing: number) {
  // Anstatt einen festen Buffer zu verwenden, berechnen wir eine BBOX,
  // die der Amts-BBOX in Größe und Verhältnis entspricht
  // Die Amts-BBOX hat Dimensionen von ca. 76.35 x 76.35 Meter
  const bboxHalfWidth = 38.18; // Hälfte der Breite: 76.35/2
  const bboxHalfHeight = 38.18; // Hälfte der Höhe: 76.35/2
  
  // Verschiebung der Y-Koordinate nach Norden, um den Versatz zur Amts-Abfrage zu berücksichtigen
  // Das Amt verwendet einen nördlicheren Bereich für dieselben I/J-Koordinaten
  const northOffset = 26; // Versatz in Metern (empirisch ermittelt)
  
  // BBOX für WMS-Anfragen berechnen
  const bboxMinX = easting - bboxHalfWidth;
  const bboxMinY = northing - bboxHalfHeight + northOffset; // Nordversatz berücksichtigen
  const bboxMaxX = easting + bboxHalfWidth;
  const bboxMaxY = northing + bboxHalfHeight + northOffset; // Nordversatz berücksichtigen
  
  return {
    bboxString: `${bboxMinX},${bboxMinY},${bboxMaxX},${bboxMaxY}`,
    commonParams: {
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      FORMAT: 'image/png8',
      TRANSPARENT: 'true',
      feature_count: '100',
      info_format: 'application/json',
      WIDTH: '256',
      HEIGHT: '256',
      CRS: 'EPSG:25832',
    }
  };
}

// Funktion zum Abrufen der Expositionsdaten
async function fetchExposition(bboxString: string, commonParams: any, debug: DebugInfo) {
  const expositionParams = new URLSearchParams({
    ...commonParams,
    QUERY_LAYERS: 'DigitalTerrainModel-2.5m-Exposition',
    LAYERS: 'DigitalTerrainModel-2.5m-Exposition',
    STYLES: 'DigitalTerrainModel-Exposition',
    I: '120', // Wert für Exposition (vom Amt)
    J: '204', // Wert für Exposition (vom Amt)
    BBOX: bboxString
  });
  
  const url = `https://geoservices9.civis.bz.it/geoserver/p_bz-Elevation/ows?${expositionParams.toString()}`;
  debug.urls.exposition = url;
  
  try {
    const response = await fetch(url);
    debug.responses.exposition = {
      status: response?.status,
      statusText: response?.statusText,
      contentType: response?.headers.get('content-type')
    };
    
    if (!response.ok) return "unbekannt";
    
    const data = await response.json();
    debug.parsedData.exposition = data;
    
    if (data && data.features && data.features.length > 0) {
      const exposValue = data.features[0].properties?.GRAY_INDEX;
      if (exposValue !== undefined) {
        return degreesToDirection(exposValue);
      }
    }
    
    return "unbekannt";
  } catch (error) {
    console.error("Fehler bei der Verarbeitung der Expositionsdaten:", error);
    return "unbekannt";
  }
}

// Funktion zum Abrufen der Hangneigungsdaten
async function fetchSlope(bboxString: string, commonParams: any, debug: DebugInfo) {
  const slopeParams = new URLSearchParams({
    ...commonParams,
    QUERY_LAYERS: 'DigitalTerrainModel-2.5m-Slope',
    LAYERS: 'DigitalTerrainModel-2.5m-Slope',
    STYLES: 'DigitalTerrainModel-Slope',
    I: '119', // Wert für Slope (vom Amt)
    J: '211', // Wert für Slope (vom Amt)
    BBOX: bboxString
  });
  
  const url = `https://geoservices9.civis.bz.it/geoserver/p_bz-Elevation/ows?${slopeParams.toString()}`;
  debug.urls.slope = url;
  
  try {
    const response = await fetch(url);
    debug.responses.slope = {
      status: response?.status,
      statusText: response?.statusText,
      contentType: response?.headers.get('content-type')
    };
    
    if (!response.ok) return "unbekannt";
    
    const data = await response.json();
    debug.parsedData.slope = data;
    
    if (data && data.features && data.features.length > 0) {
      const slopeValue = data.features[0].properties?.GRAY_INDEX;
      if (slopeValue !== undefined) {
        return `${Math.round(slopeValue)}%`;
      }
    }
    
    return "unbekannt";
  } catch (error) {
    console.error("Fehler bei der Verarbeitung der Hangneigungsdaten:", error);
    return "unbekannt";
  }
}

// Funktion zum Abrufen der Höhendaten
async function fetchElevation(bboxString: string, commonParams: any, debug: DebugInfo) {
  const elevationParams = new URLSearchParams({
    ...commonParams,
    QUERY_LAYERS: 'DigitalTerrainModel-2.5m',
    LAYERS: 'DigitalTerrainModel-2.5m',
    STYLES: 'DigitalTerrainModel',
    I: '119', // Wert für Elevation (vom Amt)
    J: '205', // Wert für Elevation (vom Amt)
    BBOX: bboxString
  });
  
  const url = `https://geoservices9.civis.bz.it/geoserver/p_bz-Elevation/ows?${elevationParams.toString()}`;
  debug.urls.elevation = url;
  
  try {
    const response = await fetch(url);
    debug.responses.elevation = {
      status: response?.status,
      statusText: response?.statusText,
      contentType: response?.headers.get('content-type')
    };
    
    if (!response.ok) return "unbekannt";
    
    const data = await response.json();
    debug.parsedData.elevation = data;
    
    if (data && data.features && data.features.length > 0) {
      const elevationValue = data.features[0].properties?.GRAY_INDEX;
      if (elevationValue !== undefined) {
        return `${Math.round(elevationValue)} m`;
      }
    }
    
    return "unbekannt";
  } catch (error) {
    console.error("Fehler bei der Verarbeitung der Höhendaten:", error);
    return "unbekannt";
  }
}

// Funktion zum Abrufen der Katasterdaten
async function fetchCadastre(bboxString: string, commonParams: any, debug: DebugInfo) {
  const cadastreParams = new URLSearchParams({
    ...commonParams,
    QUERY_LAYERS: 'ParcelsAggregate',
    LAYERS: 'ParcelsAggregate',
    STYLES: 'ParcelsAggregate-Web-NoLabel',
    I: '106', // Wert für Kataster (aus erfolgreicher Beispielabfrage)
    J: '220', // Wert für Kataster (aus erfolgreicher Beispielabfrage)
    BBOX: bboxString
  });
  
  const url = `https://geoservices5.civis.bz.it/geoserver/p_bz-Cadastre/ows?${cadastreParams.toString()}`;
  debug.urls.cadastre = url;
  
  try {
    const response = await fetch(url);
    debug.responses.cadastre = {
      status: response?.status,
      statusText: response?.statusText,
      contentType: response?.headers.get('content-type')
    };
    
    if (!response.ok) return undefined;
    
    const data = await response.json();
    debug.parsedData.cadastre = data;
    
    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const properties = feature.properties;
      
      if (properties) {
        return {
          parzellennummer: properties.PART_CODICE || undefined,
          flaeche: properties.PART_AREA_TOTALE || undefined,
          katastralgemeinde: properties.PART_CCAT_NOME_DE || undefined,
          katastralgemeindeKodex: properties.PART_CCAT_CODICE?.toString() || undefined,
          gemeinde: properties.PART_CAMM_NOME_DE || undefined,
          istatKodex: properties.PART_ISTAT?.toString() || undefined
        };
      }
    }
    
    return undefined;
  } catch (error) {
    console.error("Fehler bei der Verarbeitung der Katasterdaten:", error);
    return undefined;
  }
}

// Funktion zum Abrufen der Gemeindeinformationen von Nominatim
async function fetchMunicipality(lat: number, lon: number, debug: DebugInfo) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=12&accept-language=de`;
  debug.urls.municipality = url;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NatureScout/1.0' // Wichtig für Nominatim API
      }
    });
    
    debug.responses.municipality = {
      status: response?.status,
      statusText: response?.statusText,
      contentType: response?.headers.get('content-type')
    };
    
    if (!response.ok) {
      return {
        municipality: "unbekannt",
        flurname: "unbekannt",
        standort: `Standort (${lat.toFixed(6)}, ${lon.toFixed(6)})`
      };
    }
    
    const data = await response.json();
    debug.parsedData.municipality = data;
    
    let municipality = "unbekannt";
    let flurname = "unbekannt";
    let standort = `Standort (${lat.toFixed(6)}, ${lon.toFixed(6)})`;
    
    if (data && data.address) {
      municipality = data.address.city || 
                   data.address.town || 
                   data.address.village || 
                   data.address.municipality || 
                   "unbekannt";
      
      flurname = data.address.suburb || 
               data.address.neighbourhood || 
               data.address.hamlet || 
               municipality;
      
      if (data.display_name) {
        standort = `${data.display_name.split(',')[0]} (${lat.toFixed(6)}, ${lon.toFixed(6)})`;
      }
    }
    
    return { municipality, flurname, standort };
  } catch (error) {
    console.error("Fehler bei der Verarbeitung der Nominatim-Daten:", error);
    return {
      municipality: "unbekannt",
      flurname: "unbekannt",
      standort: `Standort (${lat.toFixed(6)}, ${lon.toFixed(6)})`
    };
  }
}

export async function GET(request: Request) {
  // Debug-Objekt initialisieren
  const debug: DebugInfo = {
    urls: {
      exposition: '',
      slope: '',
      municipality: '',
      elevation: '',
      cadastre: ''
    },
    responses: {
      exposition: null,
      slope: null,
      municipality: null,
      elevation: null,
      cadastre: null
    },
    parsedData: {
      exposition: null,
      slope: null,
      municipality: null,
      elevation: null,
      cadastre: null
    }
  };

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const enableDebug = searchParams.get('debug') === 'true';

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude und Longitude sind erforderlich' }, 
      { status: 400 }
    );
  }

  try {
    // Koordinaten parsen
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    // UTM-Koordinaten berechnen
    const { easting, northing } = wgs84ToUtm32N(latNum, lonNum);
    
    // BBOX und gemeinsame Parameter berechnen
    const { bboxString, commonParams } = calculateBboxParams(easting, northing);
    
    // Alle Daten parallel abfragen
    const [exposition, slope, elevation, municipalityData, kataster] = await Promise.all([
      fetchExposition(bboxString, commonParams, debug),
      fetchSlope(bboxString, commonParams, debug),
      fetchElevation(bboxString, commonParams, debug),
      fetchMunicipality(latNum, lonNum, debug),
      fetchCadastre(bboxString, commonParams, debug)
    ]);
    
    // Ergebnisobjekt erstellen
    const geocodingResult: ExtendedGeocodingResult = {
      standort: municipalityData.standort,
      gemeinde: municipalityData.municipality,
      flurname: municipalityData.flurname,
      elevation: elevation,
      slope: slope,
      exposition: exposition
    };
    
    // Katasterdaten hinzufügen, wenn vorhanden
    if (kataster && Object.values(kataster).some(v => v !== undefined)) {
      geocodingResult.kataster = kataster;
    }

    // Debug-Informationen hinzufügen, wenn aktiviert
    if (enableDebug) {
      return NextResponse.json({
        ...geocodingResult,
        debug
      });
    }

    return NextResponse.json(geocodingResult);
    
  } catch (error) {
    console.error('GeoBrowser API Fehler:', error);
    return NextResponse.json(
      { 
        error: 'Fehler bei der GeoBrowser-Abfrage', 
        details: (error as Error).message,
        standort: `${lat}, ${lon}`,
        gemeinde: "unbekannt",
        flurname: "unbekannt",
        elevation: "unbekannt",
        exposition: "unbekannt",
        slope: "unbekannt"
      }, 
      { status: 500 }
    );
  }
} 