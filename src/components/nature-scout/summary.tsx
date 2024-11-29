"use client";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NatureScoutData } from "@/types/nature-scout";

interface SummaryProps {
  metadata: NatureScoutData;
  
}

export function Summary({ metadata }: SummaryProps) {
  if (!metadata.analyseErgebnis) return null;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Vielen Dank für Ihre Hilfe!</AlertTitle>
        <AlertDescription className="whitespace-pre-line">
          Ihre erfasstes Habitat wird nun von einem Experten analysiert. Wir geben Ihnen eine kurze Rückmeldung, sobald das Ergebnis verfügbar ist.
        </AlertDescription>
      </Alert>
    </div>
  );
}