'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HabitatAnalysisResult, HabitatUpdateResult } from '../types/test-types';
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Database, Check, Leaf } from 'lucide-react';

interface HabitatAnalysisProps {
  onAnalyze: () => Promise<void>;
  onUpdate: () => Promise<void>;
  analysis?: HabitatAnalysisResult;
  updateResult?: HabitatUpdateResult;
  isLoading: boolean;
}

export function HabitatAnalysis({
  onAnalyze,
  onUpdate,
  analysis,
  updateResult,
  isLoading
}: HabitatAnalysisProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {analysis && (
        <div className="flex items-center gap-1">
          <Badge 
            variant="outline" 
            className={`px-2 ${analysis.missingHabitatTypes.length > 0 ? 'text-amber-600 border-amber-600' : 'text-green-600 border-green-600'}`}
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            {analysis.missingHabitatTypes.length} fehlende Habitattypen
          </Badge>
          <Badge 
            variant="outline" 
            className={`px-2 ${analysis.habitatTypesWithMissingPlants.length > 0 ? 'text-amber-600 border-amber-600' : 'text-green-600 border-green-600'}`}
          >
            <Leaf className="h-3 w-3 mr-1" />
            {analysis.habitatTypesWithMissingPlants.length} mit fehlenden Pflanzen
          </Badge>
        </div>
      )}

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => !analysis && onAnalyze()}
            disabled={isLoading}
          >
            Habitat-Analyse
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Habitat-Typen Analyse</DialogTitle>
            <DialogDescription>
              Analysiert die Habitattypen in der Datenbank und vergleicht sie mit den Testfällen.
            </DialogDescription>
          </DialogHeader>

          {analysis && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between text-sm">
                <span>Habitattypen in der Datenbank: {analysis.totalHabitatTypes}</span>
                <span>Testfälle: {analysis.totalTestCases}</span>
              </div>

              {analysis.missingHabitatTypes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Fehlende Habitattypen ({analysis.missingHabitatTypes.length})
                  </h3>
                  <ul className="pl-5 list-disc space-y-1 text-sm">
                    {analysis.missingHabitatTypes.map((habitat, index) => (
                      <li key={index}>
                        <span className="font-semibold">{habitat.name}</span> ({habitat.category})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.habitatTypesWithMissingPlants.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-amber-600" />
                    Habitattypen mit fehlenden Pflanzen ({analysis.habitatTypesWithMissingPlants.length})
                  </h3>
                  <ul className="pl-5 list-disc space-y-2 text-sm">
                    {analysis.habitatTypesWithMissingPlants.map((habitat, index) => (
                      <li key={index}>
                        <div className="font-semibold">{habitat.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Fehlende Pflanzen: {habitat.missingPlants.length}
                        </div>
                        <div className="pl-4 text-xs text-muted-foreground mt-1">
                          {habitat.missingPlants.slice(0, 3).join(', ')}
                          {habitat.missingPlants.length > 3 && ` und ${habitat.missingPlants.length - 3} weitere`}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {updateResult && updateResult.updatedHabitatTypes.length > 0 && (
                <div className="space-y-2 mt-4 border-t pt-4">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Aktualisierte Habitattypen ({updateResult.updatedHabitatTypes.length})
                  </h3>
                  <ul className="pl-5 list-disc space-y-2 text-sm">
                    {updateResult.updatedHabitatTypes.map((habitat, index) => (
                      <li key={index}>
                        <div className="font-semibold">{habitat.name}</div>
                        <div className="text-xs">
                          <span className="text-green-600">+{habitat.addedPlants.length} Pflanzen</span>
                          <span className="text-muted-foreground ml-2">
                            (Jetzt insgesamt {habitat.totalPlants} Pflanzen)
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onAnalyze()}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Analysieren
            </Button>
            <Button
              onClick={() => onUpdate()}
              disabled={isLoading || !analysis || analysis.habitatTypesWithMissingPlants.length === 0}
              className="flex-1 sm:flex-none"
            >
              <Database className="h-4 w-4 mr-2" />
              Datenbank aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 