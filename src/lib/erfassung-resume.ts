import { NatureScoutData } from '@/types/nature-scout';
import { isPolygonClosed } from '@/components/natureScout/LocationDetermination';

function hasValidCoordinates(metadata: NatureScoutData): boolean {
  return Boolean(
    metadata.latitude &&
    metadata.longitude &&
    metadata.latitude !== 0 &&
    metadata.longitude !== 0
  );
}

export function hasSavedPolygon(metadata: NatureScoutData): boolean {
  const pts = metadata.polygonPoints;
  return Boolean(
    pts &&
    pts.length >= 3 &&
    isPolygonClosed(pts) &&
    hasValidCoordinates(metadata)
  );
}

function hasLocationFields(metadata: NatureScoutData): boolean {
  return Boolean(metadata.gemeinde && metadata.flurname);
}

function hasImage(metadata: NatureScoutData, imageKey: string): boolean {
  return (metadata.bilder || []).some((b) => b.imageKey === imageKey);
}

/**
 * Leitet den passenden Erfassungsschritt aus gespeicherten Metadaten ab (Resume Server-Entwurf / lokale Session).
 * Schritte entsprechen `schritte` in NatureScout.tsx (0 = Willkommen … 9 = Verifizierung).
 */
export function inferResumeStep(metadata: NatureScoutData): number {
  if (metadata.analyseErgebnis) return 8;

  if (hasImage(metadata, 'Detailbild_2')) return 8;
  if (hasImage(metadata, 'Detailbild_1')) return 7;
  if (hasImage(metadata, 'Detailansicht')) return 6;
  if (hasImage(metadata, 'Panoramabild')) return 5;

  if (hasSavedPolygon(metadata)) {
    return hasLocationFields(metadata) ? 4 : 3;
  }

  if (metadata.polygonPoints && metadata.polygonPoints.length > 0) return 2;
  if (hasValidCoordinates(metadata)) return 2;

  return 1;
}
