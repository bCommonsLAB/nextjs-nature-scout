import { ObjectId } from 'mongodb';

export interface NatureScoutData {
  erfassungsperson: string;
  organizationId: string;
  organizationName: string;
  organizationLogo: string;
  email: string;
  gemeinde: string;
  flurname: string;
  latitude: number;
  longitude: number;
  standort: string;
  elevation?: string;
  exposition?: string;
  slope?: string;
  plotsize?: number;
  polygonPoints?: Array<[number, number]>;
  kataster?: {
    parzellennummer?: string;
    flaeche?: number;
    katastralgemeinde?: string;
    katastralgemeindeKodex?: string;
    gemeinde?: string;
    istatKodex?: string;
  };
  bilder: Bild[];
  analyseErgebnis?: AnalyseErgebnis;
  llmInfo?: llmInfo;
  kommentar?: string;
}

export interface GeocodingResult {
  standort: string;
  gemeinde: string;
  flurname: string;
  elevation?: string;
  exposition?: string;
  slope?: string;
  kataster?: {
    parzellennummer?: string;
    flaeche?: number;
    katastralgemeinde?: string;
    katastralgemeindeKodex?: string;
    gemeinde?: string;
    istatKodex?: string;
  };
}


export interface Bild {
  imageKey: string;
  filename: string;
  url: string;
  lowResUrl?: string;
  analyse: string | null;
  plantnetResult?: PlantNetResult;
  // Stabile Client-ID zur Idempotenz beim (Wieder-)Verknüpfen/Sync von Bildern (Offline-Erfassung).
  clientImageId?: string;
}

export interface PlantNetResponse {
  query: {
    project: string;
    images: string[];
    organs: string[];
    includeRelatedImages: boolean;
  };
  language: string;
  preferedReferential: string;
  bestMatch: string;
  results: PlantNetResult[];
  remainingIdentificationRequests: number;
}

export interface PlantNetResult {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificNameAuthorship: string;
    genus: {
      scientificNameWithoutAuthor: string;
    };
    family: {
      scientificNameWithoutAuthor: string;
    };
    commonNames: string[];
    scientificName: string;
  };
}


/**
 * Rolle einer handelnden Person (vgl. IUser.role in user-service.ts).
 */
export type BenutzerRolle = 'user' | 'experte' | 'admin' | 'superadmin';

/**
 * Audit-Information über eine handelnde Person (Verifizierung, Löschung, History).
 */
export interface AuditUser {
  userId: string;
  userName: string;
  email?: string;
  role: BenutzerRolle;
}

/**
 * Vom Experten/Admin verifiziertes (effektives) Ergebnis. Hat fachlich Vorrang vor `result`.
 * Siehe specs/regeln/verifizierungs-workflow.md.
 */
export interface VerifiedResult {
  habitattyp?: string;
  habitatfamilie?: string;
  schutzstatus?: string;
  kommentar?: string;
}

/**
 * Eintrag der Versionshistorie (Reanalyse & Verifizierung).
 */
export interface HabitatHistoryEntry {
  date: Date;
  user: AuditUser;
  module: string;
  previousResult?: {
    habitattyp?: string;
    habitatfamilie?: string;
    schutzstatus?: string;
    kommentar?: string;
  } | null;
  changes?: {
    bildCount?: number;
    habitattyp?: string;
    habitatfamilie?: string;
    schutzstatus?: string;
    kommentar?: string;
  };
}

/**
 * Habitat-Datensatz (Collection `analyseJobs`).
 *
 * Spec: specs/entitaeten/habitat.md – diese Definition spiegelt das tatsächlich
 * persistierte Dokument inkl. Verifizierungs-, Soft-Delete- und History-Feldern wider.
 */
export interface AnalysisJob {
  _id: ObjectId;
  jobId: string; // Fachlicher/öffentlicher Identifikator (= "auftragsId" in URLs)
  // 'draft' = Erfassung läuft, noch nicht analysiert (ausfallsichere/offline-fähige Erfassung).
  // Ablauf: draft → (Analyse starten) → pending → analyzing → completed/failed.
  // Invariante: 'draft'-Datensätze sind nie öffentlich und tauchen nicht in normalen Listen auf
  // (nur unter "Meine Habitate → Entwürfe"). Siehe specs/regeln/offline-erfassung-und-sync.md.
  status: 'draft' | 'pending' | 'analyzing' | 'completed' | 'failed';
  metadata: NatureScoutData;
  result?: AnalyseErgebnis | null;
  llmInfo?: llmInfo
  error?: string | null;
  startTime: Date;
  updatedAt: Date;
  protectionStatus?: 'red' | 'yellow' | 'green';

  // Verifizierung (gesetzt durch effective-habitat/route.ts, entfernt durch unverify/route.ts)
  verified?: boolean;
  verifiedAt?: Date;
  verifiedBy?: AuditUser;
  verifiedResult?: VerifiedResult;

  // Soft-Delete (gesetzt durch DELETE /api/habitat/[auftragsId])
  deleted?: boolean;
  deletedAt?: Date;
  deletedBy?: AuditUser;

  // Versionshistorie (Reanalyse & Verifizierung)
  history?: HabitatHistoryEntry[];
}


export interface openAiResult {
  result?: AnalyseErgebnis | null;
  llmInfo?: llmInfo;
  error?: string;
}

export interface SimplifiedSchema {
  [key: string]: string | SimplifiedSchema | { [key: string]: string };
}

export interface llmInfo {
  modelPflanzenErkennung?: string;
  modelHabitatErkennung?: string;
  modelSchutzstatusErkennung?: string;
  systemInstruction?: string;
  hapitatQuestion?: string;
  habitatStructuredOutput?: SimplifiedSchema;
  schutzstatusQuestion?: string;
  schutzstatusStructuredOutput?: SimplifiedSchema;
  fullSchemaStructure?: any;
}

export interface AnalyseErgebnis {
  bildanalyse: Array<{
    bilder: string;
  }>;
  pflanzenarten: Array<{
    name: string;
    häufigkeit: string;
    istzeiger: boolean;
  }>;
  vegetationsstruktur: {
    höhe: string;
    dichte: string;
    deckung: string;
  };
  blühaspekte: {
    intensität: string;
    anzahlfarben: number;
  };
  nutzung: {
    beweidung: boolean;
    mahd: boolean;
    düngung: boolean;
  };
  habitattyp: string;
  habitatfamilie: string;
  schutzstatus: string;
  bewertung: {
    artenreichtum: number;
    konfidenz: number;
  };
  evidenz: {
    dafür_spricht: string[];
    dagegen_spricht: string[];
  };
  zusammenfassung: string;
  kommentar?: string;
}

export interface GetImageProps {
  imageTitle: string;
  anweisung: string;
  existingImage?: Bild;
  doAnalyzePlant?: boolean;
  onBildUpload: (
    imageTitle: string, 
    filename: string, 
    url: string, 
    analyse: string,
    plantnetResult?: PlantNetResult
  ) => void;
}

export interface LocationMetadata {
  address?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface DebugInfo {
  debug?: {
    expositionUrl?: string;
    expositionResponse?: {
      status: number;
      statusText: string;
      contentType: string;
    };
    slopeUrl?: string;
    slopeResponse?: {
      status: number;
      statusText: string;
      contentType: string;
    };
    municipalityUrl?: string;
    municipalityResponse?: {
      status: number;
      statusText: string;
      contentType: string;
    };
    parsedData?: {
      exposition?: any;
      slope?: any;
      municipality?: any;
    };
  };
  error?: string;
}