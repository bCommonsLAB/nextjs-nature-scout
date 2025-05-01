import { ObjectId } from 'mongodb';

export interface NatureScoutData {
  erfassungsperson: string;
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
}


export interface Bild {
  imageKey: string;
  filename: string;
  url: string;
  analyse: string | null;
  plantnetResult?: PlantNetResult;
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


export interface AnalysisJob {
  _id: ObjectId;
  jobId: string; // Neue Zeile für die ursprüngliche ID
  status: 'pending' | 'completed' | 'failed';
  metadata: NatureScoutData;
  result?: AnalyseErgebnis | null;
  llmInfo?: llmInfo
  error?: string | null;
  startTime: Date;
  updatedAt: Date;
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