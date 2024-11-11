export interface Bild {
  imageKey: string;
  filename: string;
  url: string;
  analyse: string;
}

export interface AnalyseErgebnis {
  analyses: Array<{
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
  }>;
}