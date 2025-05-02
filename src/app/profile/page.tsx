'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('none');
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  
  // Zustand für die Einwilligungen
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentImageCcby, setConsentImageCcby] = useState(false);
  const [habitatNameVisibility, setHabitatNameVisibility] = useState<'public' | 'members' | null>('public');

  // Prüfen, ob alle erforderlichen Felder ausgefüllt sind
  const isFormValid = consentDataProcessing && consentImageCcby && habitatNameVisibility !== null;
  
  // Prüfen, ob alle Einwilligungen erteilt wurden
  const hasAllConsents = consentDataProcessing && consentImageCcby;

  useEffect(() => {
    async function fetchUserData() {
      if (!isLoaded || !user) return;

      try {
        const response = await fetch(`/api/users/${user.id}`);
        
        if (!response.ok) {
          throw new Error('Fehler beim Abrufen der Benutzerdaten');
        }
        
        const data = await response.json();
        setUserData(data);
        
        // Einwilligungen aus den Benutzerdaten setzen
        setConsentDataProcessing(!!data.consent_data_processing);
        setConsentImageCcby(!!data.consent_image_ccby);
        setHabitatNameVisibility(data.habitat_name_visibility || 'public');
        setSelectedOrg(data.organizationId || 'none');
        
        // Wenn Einwilligungen fehlen, Dialog anzeigen
        if (!data.consent_data_processing || !data.consent_image_ccby) {
          setConsentDialogOpen(true);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchOrganizations() {
      try {
        const response = await fetch('/api/organizations');
        if (!response.ok) {
          throw new Error('Fehler beim Laden der Organisationen');
        }
        const data = await response.json();
        setOrganizations(data);
      } catch (err) {
        console.error('Error fetching organizations:', err);
      }
    }

    fetchUserData();
    fetchOrganizations();
  }, [user, isLoaded]);

  // Wenn keine Organisation ausgewählt ist, setze die Sichtbarkeit auf "public"
  useEffect(() => {
    if (selectedOrg === 'none' && habitatNameVisibility === 'members') {
      setHabitatNameVisibility('public');
    }
  }, [selectedOrg, habitatNameVisibility]);

  // Alle Profileinstellungen speichern
  const saveProfile = async () => {
    if (!isLoaded || !user) return;
    if (!hasAllConsents) {
      setConsentDialogOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // "none" in null umwandeln für die Datenbank
      const orgIdToSave = selectedOrg === 'none' ? null : selectedOrg;
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: orgIdToSave,
          consent_data_processing: consentDataProcessing,
          consent_image_ccby: consentImageCcby,
          habitat_name_visibility: habitatNameVisibility,
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Profileinstellungen');
      }

      toast.success('Profileinstellungen wurden erfolgreich gespeichert');
      
      // Benutzerdaten aktualisieren
      const updatedUserData = await response.json();
      setUserData(updatedUserData);
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Fehler beim Speichern der Profileinstellungen');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Einwilligungen im Dialog speichern
  const saveConsents = async () => {
    if (!isLoaded || !user) return;
    if (!isFormValid) {
      toast.error('Bitte treffe alle erforderlichen Auswahlen');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consent_data_processing: consentDataProcessing,
          consent_image_ccby: consentImageCcby,
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Einwilligungen');
      }

      toast.success('Einwilligungen wurden erfolgreich gespeichert');
      
      // Benutzerdaten aktualisieren
      const updatedUserData = await response.json();
      setUserData(updatedUserData);
      
      // Dialog schließen
      setConsentDialogOpen(false);
    } catch (err) {
      console.error('Error saving consents:', err);
      toast.error('Fehler beim Speichern der Einwilligungen');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || isLoading) {
    return <div className="flex justify-center items-center h-screen">Lade...</div>;
  }

  if (!user) {
    router.push('/anmelden');
    return null;
  }

  // Organisationsnamen finden
  const findOrgName = (orgId: string) => {
    if (!orgId || orgId === 'none') return 'Keine Organisation';
    const org = organizations.find(o => o._id === orgId);
    return org ? org.name : orgId;
  };

  return (
    <>
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Profilkarte */}
        <Card>
          <CardHeader>
            <CardTitle>Mein Profil</CardTitle>
            <CardDescription>
              Hier findest du deine persönlichen Informationen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="mt-1">{userData?.name || user.fullName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">E-Mail</h3>
                <p className="mt-1">{userData?.email || user.primaryEmailAddress?.emailAddress}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Rolle</h3>
                <p className="mt-1">{userData?.role || 'Benutzer'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Organisation</h3>
                <p className="mt-1">{userData?.organizationId ? findOrgName(userData.organizationId) : 'Keine Organisation'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organisationszugehörigkeit */}
        <Card>
          <CardHeader>
            <CardTitle>Mitglied einer Organisation</CardTitle>
            <CardDescription>
              Wähle die Organisation aus, der du angehörst.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organisation</Label>
              <Select 
                value={selectedOrg} 
                onValueChange={setSelectedOrg}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Organisation wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Organisation</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org._id} value={org._id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Deine erfassten Habitate werden nach einer Verifizierung eines Experten unter dem Namen der Organisation veröffentlicht. Deine Auswahl wird von einem Administrator kontrolliert und kann ggf. zurückgenommen werden.

              </p>
            </div>
            </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              Du kannst deine Entscheidungen jederzeit ändern.
            </p>
            <Button 
              onClick={() => {
                if (hasAllConsents) {
                  saveProfile();
                } else {
                  setConsentDialogOpen(true);
                }
              }} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Speichere...' : 'Profileinstellungen speichern'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sichtbarkeit meines Namens</CardTitle>
            <CardDescription>
              Alle erfassten Habitate werden mit deinem Klarnamen des Erfassers gespeichert.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground mb-2">
               Ich stimme zu, dass mein <strong>Klarnamen</strong> bei gemeldeten Habitaten angezeigt wird:
             </p>
             <RadioGroup 
               value={habitatNameVisibility || ''} 
               onValueChange={(value) => setHabitatNameVisibility(value as 'public' | 'members')}
             >
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="public" id="name_public" />
                 <Label htmlFor="name_public">öffentlich (für alle sichtbar)</Label>
               </div>
               <div className="flex items-center space-x-2">
                 <RadioGroupItem 
                   value="members" 
                   id="name_members" 
                   disabled={selectedOrg === 'none'} 
                 />
                 <Label 
                   htmlFor="name_members" 
                   className={selectedOrg === 'none' ? "text-muted-foreground" : ""}
                 >
                   nur für Mitglieder meiner Organisation
                   {selectedOrg !== 'none' && (
                     <span className="ml-1 text-muted-foreground">
                       ({findOrgName(selectedOrg)})
                     </span>
                   )}
                 </Label>
               </div>
               {selectedOrg === 'none' && habitatNameVisibility === 'members' && (
                 <p className="text-sm text-amber-600 mt-1">
                   Die Option "nur für Mitglieder" ist nur verfügbar, wenn Sie oben eine Organisation auswählen.
                 </p>
               )}
             </RadioGroup>
             {selectedOrg === 'none' && (
               <p className="text-xs text-muted-foreground mt-2">
                 <em>Hinweis: Die Option "nur für Mitglieder" ist erst verfügbar, wenn Sie oben eine Organisation auswählen.</em>
               </p>
             )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              Du kannst deine Entscheidungen jederzeit ändern.
            </p>
           
          </CardFooter>
        </Card>
      </div>

      {/* Einwilligungs-Dialog */}
      <Dialog open={consentDialogOpen} onOpenChange={(open) => {
        // Wenn Dialog geschlossen wird und Einwilligungen fehlen, dann zur Startseite umleiten
        if (!open && !hasAllConsents) {
          router.push('/');
        } else {
          setConsentDialogOpen(open);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Erforderliche Einwilligungen</DialogTitle>
            <DialogDescription>
              Du musst diesen Einwilligungen zustimmen, um dein Profil zu speichern und die Anwendung zu nutzen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Datenverarbeitung */}
            <div className="space-y-2">
              <Label htmlFor="consent_data_processing" className="font-medium">
                  Verarbeitung personenbezogener Daten
              </Label>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="consent_data_processing" 
                  checked={consentDataProcessing}
                  onCheckedChange={(checked) => setConsentDataProcessing(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <p className="text-sm text-muted-foreground">
                    Ich bestätige, die Datenschutzerklärung gelesen zu haben, und <strong>erteile meine Zustimmung</strong> zur elektronischen Verarbeitung der angegebenen Daten gemäß Verordnung (EU) 2016/679 (DSGVO).
                  </p>
                </div>
              </div>
            </div>

            {/* Bilderlizenz */}
            <div className="space-y-2">
              <Label htmlFor="consent_image_ccby" className="font-medium">
                  Lizenz für hochgeladene Habitat Bilder und Informationen
              </Label>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="consent_image_ccby" 
                  checked={consentImageCcby}
                  onCheckedChange={(checked) => setConsentImageCcby(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <p className="text-sm text-muted-foreground">
                    Ich bin damit einverstanden, dass die von mir hochgeladenen Bilder und Informationen zu Habitate unter der <strong>Creative Commons‑Lizenz (CC BY 4.0)</strong> veröffentlicht und weiterverwendet werden.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => router.push('/')} variant="outline">
              Abbrechen
            </Button>
            <Button 
              onClick={saveConsents} 
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? 'Speichere...' : 'Einwilligungen bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 