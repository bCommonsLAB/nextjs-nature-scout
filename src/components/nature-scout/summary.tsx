"use client";

import { FileDown } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AnalyseErgebnis } from "@/types/nature-scout";

interface SummaryProps {
  analyseErgebnis: AnalyseErgebnis | null;
  handlePDFDownload: () => void;
}

export function Summary({ analyseErgebnis, handlePDFDownload }: SummaryProps) {
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
    </div>
  );
} 