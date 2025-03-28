"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Settings, TestTube2, ShieldCheck, Users, Code, ShieldPlus } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { UserProfileButton } from "@/components/user-profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useNatureScoutState } from "@/context/nature-scout-context";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExpert, setIsExpert] = useState(false);
  const { metadata, editJobId } = useNatureScoutState();
  const router = useRouter();
  
  // State für den Bestätigungs-Dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // State für das mobile Menü
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Funktion, die prüft, ob ungespeicherte Änderungen vorhanden sind
  const hasUnsavedChanges = () => {
    // Wenn metadata existiert und mindestens ein Feld ausgefüllt ist, aber kein editJobId,
    // dann gibt es wahrscheinlich ungespeicherte Änderungen
    return metadata && !editJobId && (
      metadata.standort || 
      metadata.gemeinde || 
      metadata.latitude !== 0 || 
      metadata.longitude !== 0 ||
      (metadata.polygonPoints && metadata.polygonPoints.length > 0) ||
      (metadata.bilder && metadata.bilder.length > 0)
    );
  };

  // Funktion zum Navigieren zu neuem Habitat
  const navigateToNewHabitat = () => {
    if (hasUnsavedChanges()) {
      // Wenn ungespeicherte Änderungen vorhanden sind, Dialog öffnen
      setConfirmDialogOpen(true);
    } else {
      // Sonst direkt navigieren
      router.push('/naturescout');
      // Mobile Menü schließen nach Navigation
      setIsMobileMenuOpen(false);
    }
  };

  // Funktion für die Navigation mit Link-Elementen
  const handleMobileNavigation = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  // Bestätigung zum Fortfahren
  const confirmNavigation = () => {
    setConfirmDialogOpen(false);
    router.push('/naturescout');
    // Mobile Menü schließen nach Navigation
    setIsMobileMenuOpen(false);
  };

  // Überprüfe, ob der Benutzer Admin-Rechte hat und ob er ein Experte ist
  useEffect(() => {
    const checkUserStatus = async () => {
      if (isLoaded && user) {
        try {
          // Admin-Status prüfen
          const adminResponse = await fetch(`/api/users/isAdmin`);
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            setIsAdmin(adminData.isAdmin);
          } else {
            setIsAdmin(false);
          }

          // Experten-Status prüfen
          const expertResponse = await fetch(`/api/users/isExpert`);
          if (expertResponse.ok) {
            const expertData = await expertResponse.json();
            setIsExpert(expertData.isExpert);
          } else {
            setIsExpert(false);
          }
        } catch (error) {
          console.error('Fehler beim Überprüfen des Benutzer-Status:', error);
          setIsAdmin(false);
          setIsExpert(false);
        }
      }
    };

    checkUserStatus();
  }, [isLoaded, user]);

  return (
    <header className="flex flex-col justify-center px-16 w-full bg-stone-50 min-h-[72px] max-md:px-5">
      <nav className="flex flex-wrap gap-10 justify-between items-center w-full">
        <div className="flex justify-center items-center self-stretch my-auto max-w-[198px]">
          <Link href="/">
            <Image
              src="/images/naturescout-normal.svg"
              alt="NatureScout Logo"
              width={213}
              height={36}
              priority
              className="h-[36px] object-contain"
              style={{ width: 'auto' }}
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-8 justify-center items-center self-stretch my-auto">
          <SignedIn>
            <Button variant="ghost" className="text-base" onClick={navigateToNewHabitat}>
              <ShieldPlus className="h-4 w-4 mr-2" />
              Neues Habitat
            </Button>
            <Link href="/habitat">
              <Button variant="ghost" className="text-base">
                <ShieldCheck className="h-4 w-4 mr-2" />
                {isExpert || isAdmin ? "Habitatverwaltung" : "Meine Habitate"}
              </Button>
            </Link>
          </SignedIn>
          <SignedIn>
            {isAdmin && (
              <>
                <Link href="/admin/users">
                  <Button variant="ghost" className="text-base">
                    <Users className="h-4 w-4 mr-2" />
                    Benutzer
                  </Button>
                </Link>
                <Link href="/tests">
                  <Button variant="ghost" className="text-base">
                    <TestTube2 className="h-4 w-4 mr-2" />
                    Tests
                  </Button>
                </Link>
                <Link href="/admin/config">
                  <Button variant="ghost" className="text-base">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </Link>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="text-base">
                      <Code className="h-4 w-4 mr-2" />
                      Debug
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Analysierte Daten
                        {editJobId && (
                          <span className="ml-2 text-sm font-normal bg-gray-100 px-2 py-1 rounded">
                            Job-ID: {editJobId}
                          </span>
                        )}
                      </DialogTitle>
                    </DialogHeader>
                    <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </DialogContent>
                </Dialog>
              </>
            )}
            
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="secondary" className="text-base">
                Jetzt Anmelden
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserProfileButton />
          </SignedIn>
        </div>

        {/* Mobile Navigation */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle className="text-left mb-4">
              Navigation
            </SheetTitle>
            <div className="flex flex-col gap-4">
              <SignedIn>
                <Button variant="ghost" className="w-full text-base justify-start" onClick={navigateToNewHabitat}>
                  <ShieldPlus className="h-4 w-4 mr-2" />
                  Neues Habitat
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-base justify-start"
                  onClick={() => handleMobileNavigation('/habitat')}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {isExpert || isAdmin ? "Habitatverwaltung" : "Meine Habitate"}
                </Button>
                {isAdmin && (
                  <>
                    <Button 
                      variant="ghost" 
                      className="w-full text-base justify-start"
                      onClick={() => handleMobileNavigation('/admin/users')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Benutzer
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-base justify-start"
                      onClick={() => handleMobileNavigation('/tests')}
                    >
                      <TestTube2 className="h-4 w-4 mr-2" />
                      Tests
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-base justify-start"
                      onClick={() => handleMobileNavigation('/admin/config')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full text-base justify-start">
                          <Code className="h-4 w-4 mr-2" />
                          Debug
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Analysierte Daten
                            {editJobId && (
                              <span className="ml-2 text-sm font-normal bg-gray-100 px-2 py-1 rounded">
                                Job-ID: {editJobId}
                              </span>
                            )}
                          </DialogTitle>
                        </DialogHeader>
                        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="secondary" className="w-full !text-base !p-4 justify-start">
                    Jetzt Anmelden
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="pt-2 pl-2">
                  <UserProfileButton />
                </div>
              </SignedIn>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
      
      {/* Bestätigungsdialog für ungespeicherte Änderungen */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ungespeicherte Änderungen</DialogTitle>
            <DialogDescription>
              Bestehendes Habitat ist noch nicht gespeichert. Trotzdem fortfahren? Alle eingegebenen Daten gehen verloren!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
            >
              Nein
            </Button>
            <Button 
              type="button" 
              onClick={confirmNavigation}
            >
              JA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}