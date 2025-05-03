"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Settings, TestTube2, MapPinCheckInside, Users, Code, MapPinPlusInside, Map } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs";
import { UserOrganisationButton } from "@/components/user-organisation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useNatureScoutState } from "@/context/nature-scout-context";
import { useRouter, usePathname } from "next/navigation";
import { useUserConsent } from "@/hooks/use-user-consent";
import { toast } from "sonner";

export function Navbar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExpert, setIsExpert] = useState(false);
  const { metadata, editJobId } = useNatureScoutState();
  const router = useRouter();
  const pathname = usePathname();
  
  // State für Consent-Prüfung
  const [consentChecked, setConsentChecked] = useState(false);
  const [redirectingToConsent, setRedirectingToConsent] = useState(false);
  const [redirectedAt, setRedirectedAt] = useState<number | null>(null);
  const [profilePageLoaded, setProfilePageLoaded] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  
  // State für den Bestätigungs-Dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // State für das mobile Menü
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Prüft, ob der Benutzer Einwilligungen erteilt hat
  const hasRequiredConsents = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        return !!userData.consent_data_processing && !!userData.consent_image_ccby;
      }
      return false;
    } catch (error) {
      console.error('Fehler beim Prüfen der Benutzereinwilligungen:', error);
      return false;
    }
  };
  
  // Logger-Funktion für Consent-Workflow
  const logConsentWorkflow = (message: string, data?: any) => {
    console.log(`[CONSENT WORKFLOW] ${message}`, data || '');
    
    // Optional: Server-seitiges Logging über API
    try {
      fetch('/api/debug/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: 'info',
          source: 'consent-workflow',
          message,
          data
        }),
      }).catch(e => console.error('Logging API error:', e));
    } catch (error) {
      console.error('Failed to log consent workflow:', error);
    }
  };
  
  // Überwache den Pathname, um zu erkennen, ob die Profilseite geladen wurde
  useEffect(() => {
    if (pathname && pathname.startsWith('/profile')) {
      logConsentWorkflow('Profilseite wurde geladen');
      setProfilePageLoaded(true);
    } else {
      setProfilePageLoaded(false);
    }
  }, [pathname]);
  
  // Consent-Prüfung einmalig pro Session mit Weiterleitung zur Profilseite
  useEffect(() => {
    if (isLoaded && user && !consentChecked && !redirectingToConsent) {
      const checkConsent = async () => {
        try {
          logConsentWorkflow('Prüfe Benutzereinwilligungen', { userId: user.id });
          
          // Prüfe, ob die erforderlichen Einwilligungen fehlen
          const userHasConsents = await hasRequiredConsents(user.id);
          setNeedsConsent(!userHasConsents);
          
          if (!userHasConsents) {
            logConsentWorkflow('Einwilligungen fehlen, leite zur Profilseite weiter');
            
            // Setze Flags für die Weiterleitung
            setRedirectingToConsent(true);
            setRedirectedAt(Date.now());
            
            // Zur Profilseite weiterleiten
            router.push('/profile?consent_required=true');
          } else {
            logConsentWorkflow('Alle Einwilligungen vorhanden');
            setConsentChecked(true);
          }
        } catch (error) {
          console.error('Fehler beim Prüfen der Benutzereinwilligungen:', error);
          logConsentWorkflow('Fehler beim Prüfen der Benutzereinwilligungen', { error });
          setConsentChecked(true); // Trotzdem als geprüft markieren, um Endlosschleifen zu vermeiden
        }
      };
      
      checkConsent();
    }
  }, [isLoaded, user, router, consentChecked, redirectingToConsent]);
  
  // Überwacht, ob nach der Profilseite wieder auf eine andere Seite navigiert wird, ohne dass Einwilligungen erteilt wurden
  useEffect(() => {
    // Wir überprüfen nur, wenn der Benutzer die Profilseite geladen hatte und dann auf eine andere Seite wechselt
    const hasLeftProfilePage = profilePageLoaded && !pathname?.startsWith('/profile') && needsConsent;
    
    if (hasLeftProfilePage && isLoaded && user) {
      logConsentWorkflow('Benutzer hat Profilseite verlassen ohne Einwilligungen zu erteilen', { pathname });
      
      const checkConsentsAndLogout = async () => {
        try {
          // Prüfe erneut, ob Einwilligungen jetzt erteilt wurden
          const userHasConsents = await hasRequiredConsents(user.id);
          
          if (!userHasConsents) {
            logConsentWorkflow('Einwilligungen fehlen nach Verlassen der Profilseite, Benutzer wird abgemeldet');
            
            // Toast-Benachrichtigung anzeigen
            toast.error('Automatische Abmeldung: Erforderliche Einwilligungen wurden nicht erteilt', {
              description: 'Bitte melde dich erneut an und vervollständige deine Organisationseinstellungen.',
              duration: 5000
            });
            
            // Benutzer abmelden
            await signOut(() => {
              router.push('/');
            });
          } else {
            logConsentWorkflow('Einwilligungen wurden erteilt');
            // Zurücksetzen der Flags
            setRedirectingToConsent(false);
            setRedirectedAt(null);
            setConsentChecked(true);
            setNeedsConsent(false);
          }
        } catch (error) {
          console.error('Fehler beim erneuten Prüfen der Benutzereinwilligungen:', error);
          logConsentWorkflow('Fehler beim erneuten Prüfen der Benutzereinwilligungen', { error });
          
          // Toast-Benachrichtigung anzeigen bei Fehler
          toast.error('Automatische Abmeldung aufgrund eines Fehlers', {
            description: 'Bitte melde dich erneut an und versuche es noch einmal.',
            duration: 5000
          });
          
          // Bei Fehlern sicherheitshalber abmelden
          await signOut(() => {
            router.push('/');
          });
        }
      };
      
      checkConsentsAndLogout();
    }
  }, [pathname, isLoaded, user, signOut, router, profilePageLoaded, needsConsent]);

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
  
  // Bestimme, ob wir in einem Konsent-Flow sind und auf der Profilseite sind
  const inConsentFlow = needsConsent && profilePageLoaded;
  // Zeige nur das Logo, wenn wir in einem Konsent-Flow sind
  const showOnlyLogo = inConsentFlow;

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

        {/* Desktop Navigation - nur anzeigen, wenn wir nicht im Consent-Flow sind */}
        {!showOnlyLogo && (
          <div className="hidden md:flex gap-8 justify-center items-center self-stretch my-auto">
            <Link href="/unsere-habitate">
              <Button variant="ghost" className="text-base">
                <Map className="h-4 w-4 mr-2" />
                Unsere Habitate
              </Button>
            </Link>
            <SignedIn>
              <Button variant="ghost" className="text-base" onClick={navigateToNewHabitat}>
                <MapPinPlusInside className="h-4 w-4 mr-2" />
                Neues Habitat
              </Button>
              <Link href="/habitat">
                <Button variant="ghost" className="text-base">
                  <MapPinCheckInside className="h-4 w-4 mr-2" />
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
                  <Link href="/admin/organizations">
                    <Button variant="ghost" className="text-base">
                      <TestTube2 className="h-4 w-4 mr-2" />
                      Organisationen
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
              <UserOrganisationButton />
            </SignedIn>
          </div>
        )}

        {/* Mobile Navigation - auch nur anzeigen, wenn wir nicht im Consent-Flow sind */}
        {!showOnlyLogo && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent className="!pointer-events-auto overflow-visible"
                        side="right">
              <SheetTitle className="text-left mb-4">
                Navigation
              </SheetTitle>
              <div className="flex flex-col gap-4">
                <Button 
                  variant="ghost" 
                  className="w-full text-base justify-start"
                  onClick={() => handleMobileNavigation('/unsere-habitate')}
                >
                  <Map className="h-4 w-4 mr-2" />
                  Unsere Habitate
                </Button>
                <SignedIn>
                  <Button variant="ghost" className="w-full text-base justify-start" onClick={navigateToNewHabitat}>
                    <MapPinPlusInside className="h-4 w-4 mr-2" />
                    Neues Habitat
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-base justify-start"
                    onClick={() => handleMobileNavigation('/habitat')}
                  >
                    <MapPinCheckInside className="h-4 w-4 mr-2" />
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
                        onClick={() => handleMobileNavigation('/admin/organizations')}
                      >
                        <TestTube2 className="h-4 w-4 mr-2" />
                        Organisationen
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
                  <div className="pt-4 pl-2 clerk-user-button-container mt-auto mb-16" data-clerk-component-wrapper>
                    <UserOrganisationButton />
                  </div>
                </SignedIn>
              </div>
            </SheetContent>
          </Sheet>
        )}
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