'use client';

import { useState } from 'react';
import { useAdmin } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldAlert, RefreshCw, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface RepairStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  noUserFound: number;
}

export default function HabitatRepairPage() {
  const { isAdmin, isLoading } = useAdmin();
  const [repairing, setRepairing] = useState(false);
  const [repairComplete, setRepairComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RepairStats | null>(null);

  // Funktion zum Starten der Habitat-Reparatur
  const startRepair = async () => {
    // Bestätigung vom Benutzer einholen
    if (!confirm('Möchtest du wirklich die Habitat-Reparatur starten? Dies aktualisiert die Organisationsdaten in allen Habitaten.')) {
      return;
    }

    setRepairing(true);
    setError(null);
    setRepairComplete(false);
    
    try {
      const response = await fetch('/api/habitat/repair', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der Habitat-Reparatur');
      }
      
      const data = await response.json();
      setStats(data.stats);
      setRepairComplete(true);
    } catch (err) {
      console.error('Fehler bei der Habitat-Reparatur:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler bei der Habitat-Reparatur');
    } finally {
      setRepairing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Zugriff verweigert</AlertTitle>
          <AlertDescription>
            Du hast keine Administratorrechte für diese Seite.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Habitat-Reparatur</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Organisationsdaten in Habitaten aktualisieren</CardTitle>
          <CardDescription>
            Diese Funktion aktualisiert die Organisationsdaten in allen Habitaten basierend auf den Benutzereinstellungen der Erfasser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Alle bestehenden Habitate werden durchsucht und anhand der E-Mail-Adresse des Erfassers mit den aktuellen Organisationsdaten (ID, Name und Logo) aktualisiert. 
            Dieser Prozess kann je nach Anzahl der Habitate einige Zeit in Anspruch nehmen.
          </p>
          
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Wichtiger Hinweis</AlertTitle>
            <AlertDescription>
              Bitte stelle sicher, dass im Benutzerprofil aller Nutzer die korrekten Organisationsdaten hinterlegt sind, bevor du diese Funktion ausführst.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={startRepair} 
            disabled={repairing}
            className="w-full md:w-auto"
          >
            {repairing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Reparatur läuft...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Habitat-Reparatur starten
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {repairComplete && stats && (
        <Card>
          <CardHeader>
            <CardTitle>Reparatur abgeschlossen</CardTitle>
            <CardDescription>
              Die Habitat-Reparatur wurde erfolgreich durchgeführt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <h3 className="font-medium text-green-800">Aktualisiert</h3>
                <p className="text-3xl font-bold text-green-700">{stats.updated}</p>
                <p className="text-xs text-green-600">Habitate mit aktualisierten Organisationsdaten</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="font-medium text-gray-800">Verarbeitet</h3>
                <p className="text-3xl font-bold text-gray-700">{stats.total}</p>
                <p className="text-xs text-gray-600">Gesamt verarbeitete Habitate</p>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                <h3 className="font-medium text-amber-800">Übersprungen</h3>
                <p className="text-3xl font-bold text-amber-700">{stats.skipped + stats.noUserFound}</p>
                <p className="text-xs text-amber-600">
                  {stats.skipped} ohne E-Mail, {stats.noUserFound} ohne zugehörigen Benutzer
                </p>
              </div>
            </div>
            
            {stats.errors > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Fehler während der Verarbeitung</AlertTitle>
                <AlertDescription>
                  Bei {stats.errors} Habitaten traten Fehler während der Aktualisierung auf. Bitte prüfe die Konsole für weitere Details.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 