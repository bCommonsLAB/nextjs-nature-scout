"use client";

import { FileDown } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AnalyseErgebnis, LocationMetadata } from "@/types/nature-scout";

interface SummaryProps {
  analyseErgebnis: AnalyseErgebnis | null;
  metadata: LocationMetadata;
  handlePDFDownload: () => void;
}

const saveMetadata = async (metadata: LocationMetadata) => {
  try {
    const response = await fetch('/api/save-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error('Fehler beim Speichern der Metadaten');
    }

    const data = await response.json();
    console.log(data.message);
  } catch (error) {
    console.error(error);
  }
};


export function Summary({ analyseErgebnis, metadata, handlePDFDownload }: SummaryProps) {
  if (!analyseErgebnis) return null;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Zusammenfassung der Analyse</AlertTitle>
        <AlertDescription className="whitespace-pre-line">
          {analyseErgebnis.zusammenfassung}
        </AlertDescription>
      </Alert>
      <Button onClick={handlePDFDownload}>
        <FileDown className="mr-2 h-4 w-4" /> Bericht herunterladen (PDF)
      </Button>
      <div className="p-4">
        <h2 className="text-lg font-semibold">Zusammenfassung der Erkenntnisse</h2>
        <p>Erfassungsperson: {metadata.erfassungsperson}</p>
        {/* Hier können Sie die einzelnen Metadatenfelder anzeigen */}
        {/* ... weitere Metadatenfelder ... */}
      </div>
    </div>
  );
} 