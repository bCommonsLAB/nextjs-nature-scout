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
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const hasSeenWelcome = window.localStorage.getItem('hasSeenWelcome');
    
    if (hasSeenWelcome) {
      setIsOpen(false);
    } 
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    window.localStorage.setItem('hasSeenWelcome', 'true');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Diese Anwendung ist ein Prototyp</DialogTitle>
          <DialogDescription>
            Ein Projekt zur Förderung des Naturschutzes und der Biodiversität in
            Südtirol durch Bürgerbeteiligung und Wissenschaft.
            Teile der Anwendung sind nur ein Klickmodell und noch in Konzeption.
            Ihre Erfahrung ist wichtig und wir sind für jedes Feedback dankbar.
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