export interface NatureScoutData {
  erfassungsperson: string;
  email: string;
  gemeinde: string;
  flurname: string;
  latitude: number;
  longitude: number;
  standort: string;
  bilder: Bild[];
  analyseErgebnis?: AnalyseErgebnis;
}

export interface GeocodingResult {
  standort: string;
  gemeinde: string;
  flurname: string;
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

export interface AnalyseErgebnis {
  standort: {
    hangneigung: string;
    exposition: string;
    bodenfeuchtigkeit: string;
  };
  pflanzenArten: Array<{
    name: string;
    häufigkeit: string;
    istZeiger: boolean;
  }>;
  Vegetationsstruktur: {
    höhe: string;
    dichte: string;
    deckung: string;
  };
  blühaspekte: {
    intensität: string;
    anzahlFarben: number;
  };
  nutzung: {
    beweidung: boolean;
    mahd: boolean;
    düngung: boolean;
  };
  habitatTyp: string;
  schutzstatus: {
    gesetzlich: number;
    hochwertig: number;
    standard: number;
  };
  bewertung: {
    artenreichtum: number;
    konfidenz: number;
  };
  evidenz: {
    dafürSpricht: string[];
    dagegenSpricht: string[];
  };
  zusammenfassung: string;
}

export interface GetImageProps {
  imageTitle: string;
  anweisung: string;
  onBildUpload: (imageTitle: string, filename: string, url: string, analysis: string) => void;
  existingImage?: Bild;
}