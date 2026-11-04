// Geo-Hilfsfunktionen: Koordinaten-Transformationen.
//
// EPSG:25832 (ETRS89 / UTM Zone 32N) ist das Standard-Koordinatensystem für Südtirol
// (Landes-GeoBrowser und Gemeinde-GeoBrowser). Diese Transformation wird sowohl für die
// WMS-Abfragen an die Landesdienste (src/app/api/geobrowser/route.ts) als auch für den
// Daten-Export an den Gemeindenverband (src/app/api/habitat/export/route.ts) verwendet.
//
// Standard-UTM-Reihenentwicklung (Transverse Mercator); für Südtirol < ~0,5 m genau.

export interface Utm32NCoordinate {
  easting: number;
  northing: number;
}

/**
 * Wandelt WGS84 (EPSG:4326, Grad) nach ETRS89 / UTM Zone 32N (EPSG:25832, Meter) um.
 * @param lat Breite in Grad
 * @param lon Länge in Grad
 */
export function wgs84ToUtm32N(lat: number, lon: number): Utm32NCoordinate {
  // Konstanten für ETRS89/UTM Zone 32N (EPSG:25832)
  const a = 6378137.0;  // Äquatorradius in Metern
  const e = 0.0818192;  // Exzentrizität der Ellipse
  const lon0Rad = 9.0 * Math.PI / 180.0;  // Zentralmeridian für Zone 32 in Radiant
  const latRad = lat * Math.PI / 180.0;
  const lonRad = lon * Math.PI / 180.0;
  const k0 = 0.9996;  // Skalierungsfaktor

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

  return { easting, northing };
}
