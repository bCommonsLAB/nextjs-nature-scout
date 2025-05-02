'use client';

import { useUserConsent } from '@/hooks/use-user-consent';

/**
 * Beispielkomponente, die den useUserConsent-Hook verwendet
 * Inhalt wird nur angezeigt, wenn der Benutzer alle erforderlichen Einwilligungen gegeben hat
 */
export function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { hasRequiredConsents, isLoading } = useUserConsent();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Wenn der Benutzer nicht alle erforderlichen Einwilligungen gegeben hat,
  // wird er automatisch zur Consent-Seite umgeleitet und dieser Inhalt wird nicht angezeigt
  if (!hasRequiredConsents) {
    return null;
  }
  
  return <>{children}</>;
} 