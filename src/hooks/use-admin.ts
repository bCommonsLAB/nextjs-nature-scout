import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface UseAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  makeAdmin: () => Promise<void>;
}

/**
 * Hook zur Überprüfung, ob der aktuelle Benutzer ein Administrator ist
 */
export function useAdmin(): UseAdminResult {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funktion, um den aktuellen Benutzer zum Admin zu machen
  const makeAdmin = async () => {
    if (!isLoaded || !user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/make-admin');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Erstellen des Admin-Benutzers');
      }
      
      // Aktualisiere den Status
      setIsAdmin(true);
      setError(null);
    } catch (err) {
      console.error('Error making user admin:', err);
      setError('Fehler beim Erteilen von Admin-Rechten');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function checkAdminStatus() {
      if (!isLoaded || !user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/${user.id}`);
        
        if (response.status === 404) {
          // Benutzer existiert noch nicht in der Datenbank
          // Wir könnten hier automatisch /api/make-admin aufrufen
          console.log('Benutzer existiert noch nicht in der Datenbank');
          setIsAdmin(false);
          setError(null);
          return;
        }
        
        if (!response.ok) {
          // Ein 403 ist zu erwarten, wenn der Benutzer kein Admin ist
          if (response.status !== 403) {
            throw new Error('Fehler beim Abrufen der Benutzerinformationen');
          }
          setIsAdmin(false);
          return;
        }
        
        const userData = await response.json();
        setIsAdmin(userData.role === 'admin' || userData.role === 'superadmin');
        setError(null);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Fehler beim Überprüfen des Admin-Status');
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminStatus();
  }, [user, isLoaded]);

  return { isAdmin, isLoading, error, makeAdmin };
} 