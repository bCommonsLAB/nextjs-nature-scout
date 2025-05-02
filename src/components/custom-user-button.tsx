'use client';

import { UserButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';

export function CustomUserButton() {
  const router = useRouter();
  
  return (
    <UserButton
      afterSignOutUrl="/"
      userProfileMode="navigation"
      userProfileUrl="/profile"
      appearance={{
        elements: {
          userButtonPopoverActionButton: 'hover:bg-gray-100',
          userButtonPopoverActionButtonText: 'text-gray-900',
        }
      }}
      afterSwitchSessionUrl="/profile"
      signInUrl="/anmelden"
      userProfileProps={{
        additionalOAuthScopes: {
          google: ['profile', 'email'],
        }
      }}
      // Füge zusätzliche Menüeinträge hinzu
      afterMultiSessionSingleSessionSwitched={() => router.push('/profile')}
      afterMultiSessionSwitched={() => router.push('/profile')}
    >
      {/* Benutzerdefinierte UI für den Knopf selbst, wenn gewünscht */}
      {({ user }) => (
        <>
          <div className="hidden">
            {/* Diese UI ersetzt den Standardbutton von Clerk nicht */}
            {user?.primaryEmailAddress?.emailAddress}
          </div>
        </>
      )}
    </UserButton>
  );
} 