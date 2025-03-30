"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

// Wiederverwendbare Popup-Komponente für Erklärungen
export function InstructionDialog({ 
  open, 
  onOpenChange, 
  title, 
  content, 
  showDontShowAgain = true,
  onDontShowAgainChange,
  dontShowAgain = false,
  skipDelay = false // Diese Option überspringt die Verzögerung
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  title: string; 
  content: string;
  showDontShowAgain?: boolean;
  onDontShowAgainChange?: (checked: boolean) => void;
  dontShowAgain?: boolean;
  skipDelay?: boolean;
}) {
  // State für die verzögerte Anzeige
  const [delayedOpen, setDelayedOpen] = useState(skipDelay ? open : false);
  
  // Referenz für den Timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Verzögerte Anzeige des Dialogs
  useEffect(() => {
    // Wenn skipDelay aktiv ist, sofort anzeigen ohne Verzögerung
    if (skipDelay) {
      setDelayedOpen(open);
      return;
    }
    
    // Sonst die ursprüngliche Verzögerungslogik
    if (open) {
      // Timer setzen, um delayedOpen nach 2 Sekunden auf true zu setzen
      timerRef.current = setTimeout(() => {
        setDelayedOpen(true);
      }, 2000);
    } else {
      // Wenn open false ist, setzen wir auch delayedOpen auf false
      setDelayedOpen(false);
      
      // Timer aufräumen, falls er noch läuft
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Cleanup beim Unmount oder wenn sich open ändert
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, skipDelay]);
  
  return (
    <Dialog open={delayedOpen} onOpenChange={(value) => {
      // Wenn Dialog geschlossen wird, auch die Open-Prop setzen
      if (!value) {
        onOpenChange(false);
      }
      setDelayedOpen(value);
    }} modal={true}>
      <DialogContent 
        className="max-w-[85vw] p-0 overflow-hidden z-[9999]" 
        forceMount
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex flex-col gap-4 p-6">
          {/* Platzhalter für das Bild */}
          <div className="w-full bg-gray-200 h-[160px] rounded-md flex items-center justify-center">
            <span className="text-gray-500">Erklärendes Bild</span>
          </div>
          
          {/* Text */}
          <div className="w-full">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-gray-700">{content}</p>
          </div>
        </div>
        
        {/* Footer mit Checkbox und Button */}
        <DialogFooter className="flex flex-col sm:flex-row gap-4 sm:gap-0 items-center bg-gray-50 p-4 border-t border-gray-100">
          {showDontShowAgain && (
            <div className="flex items-center space-x-2 sm:mr-auto">
              <Checkbox 
                id="dont-show-again" 
                checked={dontShowAgain}
                onCheckedChange={onDontShowAgainChange}
              />
              <label htmlFor="dont-show-again" className="text-sm text-gray-600">
                Nicht mehr anzeigen
              </label>
            </div>
          )}
          
          <Button 
            onClick={() => onOpenChange(false)}
            size="lg"
            className="min-w-[140px]"
          >
            OK, Verstanden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 