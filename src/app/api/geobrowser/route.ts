import { NextResponse } from 'next/server';
import { GeocodingResult } from '@/types/nature-scout';

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

// Funktion zum Abfragen der Elevation von Provinz Bozen API
async function getElevationFromProvincialAPI(lat: number, lon: number): Promise<number | null> {
  try {
    // Verwende den Geobrowser-Endpunkt für Höheninformationen
    const elevationUrl = `https://maps.civis.bz.it/maps/api/v1/getfeatureinfo?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=DTM&QUERY_LAYERS=DTM&INFO_FORMAT=application/json&FEATURE_COUNT=1&SRS=EPSG:4326&BBOX=${lon-0.0001},${lat-0.0001},${lon+0.0001},${lat+0.0001}&WIDTH=101&HEIGHT=101&X=50&Y=50&FORMAT=image/png`;
    
    const response = await fetch(elevationUrl);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.features && data.features.length > 0) {
      return data.features[0].properties?.GRAY_INDEX || null;
    }
    
    return null;
  } catch (error) {
    console.error("Fehler bei der Abfrage der Provinz Bozen API:", error);
    return null;
  }
}

export async function GET(request: Request) {
  // Debug-Objekt für Logging
  const debug = {
    expositionUrl: '',
    slopeUrl: '',
    municipalityUrl: '',
    elevationUrl: '',
    expositionResponse: null as any,
    slopeResponse: null as any,
    municipalityResponse: null as any,
    elevationResponse: null as any,
    parsedData: {
      exposition: null as any,
      slope: null as any,
      municipality: null as any,
      elevation: null as any
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
    
    // Konvertiere zu UTM 32N mit verbesserter Formel
    const { easting, northing } = wgs84ToUtm32N(latNum, lonNum);
    
    // Definiere einen Buffer von 50 Metern für die BBOX
    const buffer = 50;
    
    // WMS GetFeatureInfo-Anfrage an den Südtiroler Geodienst für Expositionsinformation
    const expositionParams = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      FORMAT: 'image/png8',
      TRANSPARENT: 'true',
      QUERY_LAYERS: 'DigitalTerrainModel-2.5m-Exposition',
      LAYERS: 'DigitalTerrainModel-2.5m-Exposition',
      STYLES: 'DigitalTerrainModel-Exposition',
      feature_count: '500',
      info_format: 'application/json',
      I: '225',
      J: '199',
      WIDTH: '256',
      HEIGHT: '256',
      CRS: 'EPSG:25832',
      BBOX: `${easting-672},${northing-672},${easting+672},${northing+672}`
    });
    
    // WMS GetFeatureInfo-Anfrage für Hangneigungsinformation
    const slopeParams = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      FORMAT: 'image/png8',
      TRANSPARENT: 'true',
      QUERY_LAYERS: 'DigitalTerrainModel-2.5m-Slope',
      LAYERS: 'DigitalTerrainModel-2.5m-Slope',
      STYLES: 'DigitalTerrainModel-Slope',
      feature_count: '500',
      info_format: 'application/json',
      I: '225',
      J: '199',
      WIDTH: '256',
      HEIGHT: '256',
      CRS: 'EPSG:25832',
      BBOX: `${easting-672},${northing-672},${easting+672},${northing+672}`
    });

    // Alternativer Ansatz für Gemeindeinformationen: OpenStreetMap Nominatim API
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lonNum}&format=json&zoom=12&accept-language=de`;
    
    // Provinz Bozen Höheninformation abfragen
    const elevationUrl = `https://maps.civis.bz.it/maps/api/v1/getfeatureinfo?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=DTM&QUERY_LAYERS=DTM&INFO_FORMAT=application/json&FEATURE_COUNT=1&SRS=EPSG:4326&BBOX=${lonNum-0.0001},${latNum-0.0001},${lonNum+0.0001},${latNum+0.0001}&WIDTH=101&HEIGHT=101&X=50&Y=50&FORMAT=image/png`;
    
    // Debug-URLs
    debug.expositionUrl = `https://geoservices9.civis.bz.it/geoserver/p_bz-Elevation/ows?${expositionParams.toString()}`;
    debug.slopeUrl = `https://geoservices9.civis.bz.it/geoserver/p_bz-Elevation/ows?${slopeParams.toString()}`;
    debug.municipalityUrl = nominatimUrl;
    debug.elevationUrl = elevationUrl;
    
    // Fehlerbehandlung
    let expositionResponse, slopeResponse, municipalityResponse, elevationResponse;
    
    try {
      // Alle API-Anfragen parallel ausführen
      [expositionResponse, slopeResponse, municipalityResponse, elevationResponse] = await Promise.all([
        fetch(`https://geoservices9.civis.bz.it/geoserver/p_bz-Elevation/ows?${expositionParams.toString()}`),
        fetch(`https://geoservices9.civis.bz.it/geoserver/p_bz-Elevation/ows?${slopeParams.toString()}`),
        fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'NatureScout/1.0' // Wichtig für Nominatim API
          }
        }),
        fetch(elevationUrl)
      ]);
      
      // Debug-Informationen speichern
      debug.expositionResponse = {
        status: expositionResponse?.status,
        statusText: expositionResponse?.statusText,
        contentType: expositionResponse?.headers.get('content-type')
      };
      
      debug.slopeResponse = {
        status: slopeResponse?.status,
        statusText: slopeResponse?.statusText,
        contentType: slopeResponse?.headers.get('content-type')
      };
      
      debug.municipalityResponse = {
        status: municipalityResponse?.status,
        statusText: municipalityResponse?.statusText,
        contentType: municipalityResponse?.headers.get('content-type')
      };
      
      debug.elevationResponse = {
        status: elevationResponse?.status,
        statusText: elevationResponse?.statusText,
        contentType: elevationResponse?.headers.get('content-type')
      };
      
    } catch (error) {
      console.error("Fehler bei den API-Anfragen:", error);
    }
    
    // Default-Werte setzen
    let elevation = "unbekannt";  // Höhe über dem Meeresspiegel
    let slope = "unbekannt";      // Hangneigung
    let exposition = "unbekannt"; // Exposition
    let municipality = "unbekannt";
    let standort = `Standort (${String(lat?.substring(0, 7) || "")}, ${String(lon?.substring(0, 7) || "")})`;
    let flurname = "unbekannt";
    
    // Verarbeite Expositionsinformationen
    if (expositionResponse?.ok) {
      try {
        const expositionData = await expositionResponse.json();
        debug.parsedData.exposition = expositionData;
        
        if (expositionData && expositionData.features && expositionData.features.length > 0) {
          const exposValue = expositionData.features[0].properties?.GRAY_INDEX;
          if (exposValue !== undefined) {
            exposition = degreesToDirection(exposValue);
          }
        }
      } catch (error) {
        console.error("Fehler bei der Verarbeitung der Expositionsdaten:", error);
      }
    }
    
    // Verarbeite Hangneigungsinformationen
    if (slopeResponse?.ok) {
      try {
        const slopeData = await slopeResponse.json();
        debug.parsedData.slope = slopeData;
        
        if (slopeData && slopeData.features && slopeData.features.length > 0) {
          const slopeValue = slopeData.features[0].properties?.GRAY_INDEX;
          if (slopeValue !== undefined) {
            // Hangneigungswert als Prozentsatz speichern
            slope = `${Math.round(slopeValue)}%`;
          }
        }
      } catch (error) {
        console.error("Fehler bei der Verarbeitung der Hangneigungsdaten:", error);
      }
    }
    
    // Verarbeite Gemeindeinformationen von Nominatim
    if (municipalityResponse?.ok) {
      try {
        const nominatimData = await municipalityResponse.json();
        debug.parsedData.municipality = nominatimData;
        
        // Extrahiere Gemeindeinformationen aus Nominatim
        if (nominatimData && nominatimData.address) {
          municipality = nominatimData.address.city || 
                      nominatimData.address.town || 
                      nominatimData.address.village || 
                      nominatimData.address.municipality || 
                      "unbekannt";
          
          // Versuche, detailliertere Ortsangaben zu finden
          flurname = nominatimData.address.suburb || 
                   nominatimData.address.neighbourhood || 
                   nominatimData.address.hamlet || 
                   municipality;
          
          // Standort aus Nominatim-Display-Name
          if (nominatimData.display_name) {
            standort = `${nominatimData.display_name.split(',')[0]} (${String(lat?.substring(0, 7) || "")}, ${String(lon?.substring(0, 7) || "")})`;
          }
        }
      } catch (error) {
        console.error("Fehler bei der Verarbeitung der Nominatim-Daten:", error);
      }
    }

    // Verarbeite Höheninformationen von der Provinz Bozen API
    if (elevationResponse?.ok) {
      try {
        const elevationData = await elevationResponse.json();
        debug.parsedData.elevation = elevationData;
        
        if (elevationData && elevationData.features && elevationData.features.length > 0) {
          const elevationValue = elevationData.features[0].properties?.GRAY_INDEX || 
                               elevationData.features[0].properties?.value;
          if (elevationValue !== undefined) {
            // Höhe in Metern speichern
            elevation = `${Math.round(elevationValue)} m`;
          }
        }
      } catch (error) {
        console.error("Fehler bei der Verarbeitung der Höhendaten:", error);
      }
    }

    // Rückgabeobjekt erstellen
    const geocodingResult: GeocodingResult & { elevation: string, exposition: string, slope: string } = {
      standort: standort,
      gemeinde: municipality,
      flurname: flurname,
      elevation: elevation,      // Höhe über dem Meeresspiegel
      slope: slope,              // Hangneigung in Prozent
      exposition: exposition     // Himmelsrichtung
    };

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