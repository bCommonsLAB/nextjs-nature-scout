"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function WelcomePopup() {
  console.log('WelcomePopup wird gerendert');
  
  const [isOpen, setIsOpen] = useState(true);
  console.log('isOpen Status:', isOpen);

  useEffect(() => {
    console.log('useEffect wird ausgeführt');
    const hasSeenWelcome = window.localStorage.getItem('hasSeenWelcome');
    console.log('hasSeenWelcome aus localStorage:', hasSeenWelcome);
    
    if (hasSeenWelcome) {
      console.log('Popup wird geschlossen, da bereits gesehen');
      setIsOpen(false);
    } else {
      console.log('Popup sollte angezeigt werden');
    }
  }, []);

  const handleClose = () => {
    console.log('handleClose wird ausgeführt');
    setIsOpen(false);
    window.localStorage.setItem('hasSeenWelcome', 'true');
  };

  console.log('Render mit isOpen:', isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Wichtiger Hinweis</DialogTitle>
          <DialogDescription>
            Diese Anwendung ist ein Prototyp. Sie dient zur Erprobung neuer sinnvoller 
            Ansätze im Zusammenwirken von Bürgerbeteiligung, Wissenschaftliche Expertise 
            und Zukunftstechnologie zum Schutz unserer Umwelt. 
            Die erfassten Daten und Hinweise werden gespeichert und ausgewertet. 
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose}>Verstanden</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 