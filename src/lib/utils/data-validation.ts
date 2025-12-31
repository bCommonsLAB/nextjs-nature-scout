import { NatureScoutData, AnalyseErgebnis, AnalysisJob } from "@/types/nature-scout";

type SchutzstatusObject = Record<string, number>;

/**
 * Konvertiert einen schutzstatus zu einem protectionStatus (red, yellow, green)
 * @param schutzstatus Der zu konvertierende schutzstatus (String oder Objekt)
 * @returns 'red' | 'yellow' | 'green'
 */
export function schutzstatusToProtectionStatus(schutzstatus: unknown): 'red' | 'yellow' | 'green' {
  if (!schutzstatus) return 'green';
  
  const normalized = normalizeSchutzstatus(schutzstatus);
  const normalizedLower = normalized.toLowerCase();
  
  // RED = gesetzlich geschützt
  if (normalizedLower.includes('gesetzlich')) {
    return 'red';
  }
  
  // YELLOW = hochwertig (schützenswert, ökologisch hochwertig)
  if (normalizedLower.includes('hochwertig') || normalizedLower.includes('schützenswert')) {
    return 'yellow';
  }
  
  // GREEN = niederwertig (ökologisch niederwertig, standardvegetation, standard)
  return 'green';
}

/**
 * Normalisiert den schutzstatus, wenn er als Objekt statt als String vorliegt
 * @param schutzstatus Der zu prüfende schutzstatus
 * @returns Einen validen String-schutzstatus
 */
export function normalizeSchutzstatus(schutzstatus: unknown): string {
  if (!schutzstatus) return '';
  
  if (typeof schutzstatus === 'string') {
    return schutzstatus;
  }
  
  if (typeof schutzstatus === 'object' && schutzstatus !== null) {
    // Fall: Objekt mit Gewichtungen wie {gesetzlich: 30, hochwertig: 70, standard: 10}
    try {
      // Finde den höchsten Wert und nimm dessen Schlüssel
      const statusObj = schutzstatus as SchutzstatusObject;
      const entries = Object.entries(statusObj);
      if (entries.length === 0) return 'unbekannt';
      
      // Überprüfen, ob das erste Element existiert, bevor wir darauf zugreifen
      if (!entries[0]) return 'unbekannt';
      
      let maxKey = entries[0][0] || '';
      let maxValue = Number(entries[0][1] || 0);
      
      for (const entry of entries) {
        if (!entry || entry.length < 2) continue;
        
        const [key, value] = entry;
        const numValue = Number(value);
        if (numValue > maxValue) {
          maxValue = numValue;
          maxKey = key;
        }
      }
      
      // Konvertiere den Schlüssel in eine lesbare Form
      switch (maxKey) {
        case 'gesetzlich':
          return 'gesetzlich geschützt';
        case 'hochwertig':
          return 'ökologisch hochwertig';
        case 'standard':
          return 'ökologisch niederwertig';
        default:
          return maxKey;
      }
    } catch (error) {
      console.error('Fehler bei der Normalisierung des Schutzstatus:', error);
      return 'unbekannt';
    }
  }
  
  return 'unbekannt';
}

/**
 * Validiert und bereinigt ein AnalyseErgebnis
 * @param ergebnis Das zu validierende AnalyseErgebnis
 * @returns Ein validiertes AnalyseErgebnis
 */
export function validateAnalyseErgebnis(ergebnis: unknown): AnalyseErgebnis {
  if (!ergebnis || typeof ergebnis !== 'object' || ergebnis === null) {
    throw new Error('Ungültiges AnalyseErgebnis: null oder undefined');
  }
  
  const validatedErgebnis = { ...ergebnis as Record<string, unknown> };
  
  // Validiere schutzstatus
  if ('schutzstatus' in validatedErgebnis && validatedErgebnis.schutzstatus !== undefined) {
    validatedErgebnis.schutzstatus = normalizeSchutzstatus(validatedErgebnis.schutzstatus);
  }
  
  // Sicherstellen, dass alle erwarteten Felder existieren
  if (!validatedErgebnis.standort) validatedErgebnis.standort = { hangneigung: '', exposition: '', bodenfeuchtigkeit: '' };
  if (!validatedErgebnis.pflanzenarten) validatedErgebnis.pflanzenarten = [];
  if (!validatedErgebnis.vegetationsstruktur) validatedErgebnis.vegetationsstruktur = { höhe: '', dichte: '', deckung: '' };
  if (!validatedErgebnis.blühaspekte) validatedErgebnis.blühaspekte = { intensität: '', anzahlfarben: 0 };
  if (!validatedErgebnis.nutzung) validatedErgebnis.nutzung = { beweidung: false, mahd: false, düngung: false };
  if (!validatedErgebnis.habitattyp) validatedErgebnis.habitattyp = 'unbekannt';
  if (!validatedErgebnis.bewertung) validatedErgebnis.bewertung = { artenreichtum: 0, konfidenz: 0 };
  if (!validatedErgebnis.evidenz) validatedErgebnis.evidenz = { dafür_spricht: [], dagegen_spricht: [] };
  if (!validatedErgebnis.zusammenfassung) validatedErgebnis.zusammenfassung = '';
  
  return validatedErgebnis as unknown as AnalyseErgebnis;
}

/**
 * Validiert und bereinigt NatureScoutData
 * @param data Die zu validierenden NatureScoutData
 * @returns Validierte NatureScoutData
 */
export function validateNatureScoutData(data: unknown): NatureScoutData {
  if (!data || typeof data !== 'object' || data === null) {
    throw new Error('Ungültige NatureScoutData: null oder undefined');
  }
  
  const validatedData = { ...data as Record<string, unknown> };
  
  // Validiere analyseErgebnis, falls vorhanden
  if ('analyseErgebnis' in validatedData && validatedData.analyseErgebnis) {
    try {
      validatedData.analyseErgebnis = validateAnalyseErgebnis(validatedData.analyseErgebnis);
    } catch (error) {
      console.error('Fehler bei der Validierung des analyseErgebnis:', error);
      delete validatedData.analyseErgebnis;
    }
  }
  
  // Sicherstellen, dass andere Pflichtfelder existieren
  if (!validatedData.erfassungsperson) validatedData.erfassungsperson = '';
  if (!validatedData.organizationId) validatedData.organizationId = '';
  if (!validatedData.organizationName) validatedData.organizationName = '';
  if (!validatedData.organizationLogo) validatedData.organizationLogo = '';
  if (!validatedData.email) validatedData.email = '';
  if (!validatedData.gemeinde) validatedData.gemeinde = '';
  if (!validatedData.flurname) validatedData.flurname = '';
  if (!validatedData.bilder) validatedData.bilder = [];
  
  return validatedData as unknown as NatureScoutData;
}

/**
 * Validiert und bereinigt ein AnalysisJob-Objekt
 * @param job Das zu validierende AnalysisJob
 * @returns Ein validiertes AnalysisJob
 */
export function validateAnalysisJob(job: unknown): AnalysisJob {
  if (!job || typeof job !== 'object' || job === null) {
    throw new Error('Ungültiger AnalysisJob: null oder undefined');
  }
  
  const validatedJob = { ...job as Record<string, unknown> };
  
  // Validiere metadata
  if ('metadata' in validatedJob && validatedJob.metadata) {
    try {
      validatedJob.metadata = validateNatureScoutData(validatedJob.metadata);
    } catch (error) {
      console.error('Fehler bei der Validierung der metadata:', error);
      // Stelle sicher, dass mindestens eine leere Struktur vorhanden ist
      validatedJob.metadata = {
        erfassungsperson: '',
        organizationId: '',
        organizationName: '',
        organizationLogo: '',
        email: '',
        gemeinde: '',
        flurname: '',
        latitude: 0,
        longitude: 0,
        standort: '',
        bilder: []
      };
    }
  }
  
  // Validiere result, falls vorhanden
  if ('result' in validatedJob && validatedJob.result) {
    try {
      validatedJob.result = validateAnalyseErgebnis(validatedJob.result);
    } catch (error) {
      console.error('Fehler bei der Validierung des result:', error);
      validatedJob.result = null;
    }
  }
  
  return validatedJob as unknown as AnalysisJob;
} 