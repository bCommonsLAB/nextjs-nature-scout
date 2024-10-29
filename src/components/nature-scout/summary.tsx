"use client";

import { FileDown } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface SummaryProps {
  bewertung: string | null;
  handlePDFDownload: () => void;
}

export function Summary({ bewertung, handlePDFDownload }: SummaryProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Bewertungsergebnis</AlertTitle>
        <AlertDescription>{bewertung}</AlertDescription>
      </Alert>
      <Button onClick={handlePDFDownload}>
        <FileDown className="mr-2 h-4 w-4" /> Bericht herunterladen (PDF)
      </Button>
    </div>
  );
} 