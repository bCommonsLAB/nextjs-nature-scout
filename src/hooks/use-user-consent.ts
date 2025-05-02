import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface UserConsent {
  consent_data_processing: boolean;
  consent_image_ccby: boolean;
  habitat_name_visibility: 'public' | 'members' | null;
}

interface UseUserConsentResult {
  consents: UserConsent | null;
  hasRequiredConsents: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook zur Prüfung, ob der Benutzer die erforderlichen Einwilligungen gegeben hat
 * @param redirectToProfile Wenn true, leitet zur Profilseite um, falls Einwilligungen fehlen
 */
export function useUserConsent(redirectToProfile = true): UseUserConsentResult {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [consents, setConsents] = useState<UserConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prüft, ob alle erforderlichen Einwilligungen gegeben wurden
  const hasRequiredConsents = !!consents && 
    consents.consent_data_processing && 
    consents.consent_image_ccby && 
    !!consents.habitat_name_visibility;

  useEffect(() => {
    async function checkConsents() {
      if (!isLoaded || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/${user.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Benutzer existiert noch nicht in der Datenbank
            setConsents(null);
            return;
          }
          throw new Error('Fehler beim Abrufen der Benutzerinformationen');
        }
        
        const userData = await response.json();
        const userConsents: UserConsent = {
          consent_data_processing: !!userData.consent_data_processing,
          consent_image_ccby: !!userData.consent_image_ccby, 
          habitat_name_visibility: userData.habitat_name_visibility || null
        };
        
        setConsents(userConsents);
        
        // Umleitung zur Profilseite, wenn Einwilligungen fehlen
        if (redirectToProfile && 
            (!userConsents.consent_data_processing || 
             !userConsents.consent_image_ccby || 
             !userConsents.habitat_name_visibility)) {
          router.push('/profile/consent');
        }
      } catch (err) {
        console.error('Error checking user consents:', err);
        setError('Fehler beim Überprüfen der Benutzereinwilligungen');
      } finally {
        setIsLoading(false);
      }
    }

    checkConsents();
  }, [user, isLoaded, redirectToProfile, router]);

  return { consents, hasRequiredConsents, isLoading, error };
} 