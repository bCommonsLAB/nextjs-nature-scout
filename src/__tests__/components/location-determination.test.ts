/**
 * Unit-Tests für LocationDetermination Helper-Funktionen
 * 
 * Diese Tests prüfen die Polygon-Validierung und CTA-Status-Logik.
 * 
 * Um diese Tests auszuführen, installiere ein Test-Framework:
 * npm install --save-dev jest @testing-library/react @testing-library/jest-dom
 * 
 * Oder verwende Vitest:
 * npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
 */

import { isPolygonClosed, getPolygonCtaState } from '@/components/natureScout/LocationDetermination';

// Tests
describe('LocationDetermination Helper-Funktionen', () => {
  describe('isPolygonClosed', () => {
    it('sollte false zurückgeben für leeres Array', () => {
      expect(isPolygonClosed([])).toBe(false);
    });

    it('sollte false zurückgeben für weniger als 3 Punkte', () => {
      expect(isPolygonClosed([[0, 0]])).toBe(false);
      expect(isPolygonClosed([[0, 0], [1, 1]])).toBe(false);
    });

    it('sollte false zurückgeben für nicht geschlossenes Polygon', () => {
      const points: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1] // Nicht geschlossen (erster Punkt fehlt)
      ];
      expect(isPolygonClosed(points)).toBe(false);
    });

    it('sollte true zurückgeben für geschlossenes Polygon', () => {
      const points: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0] // Geschlossen (erster = letzter Punkt)
      ];
      expect(isPolygonClosed(points)).toBe(true);
    });

    it('sollte true zurückgeben für geschlossenes Polygon mit Toleranz', () => {
      const points: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0.0000001, 0.0000001] // Fast identisch mit erstem Punkt
      ];
      expect(isPolygonClosed(points)).toBe(true);
    });

    it('sollte false zurückgeben für Polygon mit unterschiedlichen ersten und letzten Punkten', () => {
      const points: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0.001, 0.001] // Zu unterschiedlich
      ];
      expect(isPolygonClosed(points)).toBe(false);
    });
  });

  describe('getPolygonCtaState', () => {
    it('sollte "canSave: false" zurückgeben, wenn bereits gespeichert', () => {
      const state = getPolygonCtaState([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], true);
      expect(state.hasSavedPolygon).toBe(true);
      expect(state.canSave).toBe(false);
      expect(state.disabledReason).toBe(null);
    });

    it('sollte "Mindestens 3 Punkte zeichnen" zurückgeben für leeres Array', () => {
      const state = getPolygonCtaState([], false);
      expect(state.canSave).toBe(false);
      expect(state.disabledReason).toBe("Mindestens 3 Punkte zeichnen");
      expect(state.hasSavedPolygon).toBe(false);
    });

    it('sollte "Noch X Punkte benötigt" zurückgeben für zu wenige Punkte', () => {
      const state1 = getPolygonCtaState([[0, 0]], false);
      expect(state1.canSave).toBe(false);
      expect(state1.disabledReason).toBe("Noch 2 Punkte benötigt");
      expect(state1.hasSavedPolygon).toBe(false);

      const state2 = getPolygonCtaState([[0, 0], [1, 1]], false);
      expect(state2.canSave).toBe(false);
      expect(state2.disabledReason).toBe("Noch 1 Punkt benötigt");
      expect(state2.hasSavedPolygon).toBe(false);
    });

    it('sollte "Polygon schließen" zurückgeben für nicht geschlossenes Polygon', () => {
      const points: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1] // Nicht geschlossen
      ];
      const state = getPolygonCtaState(points, false);
      expect(state.canSave).toBe(false);
      expect(state.disabledReason).toBe("Polygon schließen: ersten Punkt anklicken");
      expect(state.hasSavedPolygon).toBe(false);
    });

    it('sollte "canSave: true" zurückgeben für geschlossenes Polygon', () => {
      const points: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0] // Geschlossen
      ];
      const state = getPolygonCtaState(points, false);
      expect(state.canSave).toBe(true);
      expect(state.disabledReason).toBe(null);
      expect(state.hasSavedPolygon).toBe(false);
    });

    it('sollte korrekt mit undefined umgehen', () => {
      const state = getPolygonCtaState(undefined, false);
      expect(state.canSave).toBe(false);
      expect(state.disabledReason).toBe("Mindestens 3 Punkte zeichnen");
      expect(state.hasSavedPolygon).toBe(false);
    });

    it('sollte für 3-Punkt-Polygon funktionieren', () => {
      const points: [number, number][] = [
        [0, 0],
        [1, 0],
        [0, 0] // Geschlossen mit nur 3 Punkten
      ];
      const state = getPolygonCtaState(points, false);
      expect(state.canSave).toBe(true);
      expect(state.disabledReason).toBe(null);
    });
  });
});

