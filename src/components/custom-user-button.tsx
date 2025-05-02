'use client';

import { UserButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import { User, Settings } from "lucide-react";

export function CustomUserButton() {
  const router = useRouter();
  
  // Die offizielle Clerk Account-URL
  const clerkAccountUrl = 'https://accounts.clerk.com';
  
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          userButtonPopoverActionButton: 'hover:bg-gray-100',
          userButtonPopoverActionButtonText: 'text-gray-900',
          userButtonAvatarBox: 'w-8 h-8',
          userButtonBox: 'focus:shadow-none focus:ring-0',
          userButtonTrigger: 'focus:shadow-none focus:ring-0'
        }
      }}
      afterSwitchSessionUrl="/profile"
      signInUrl="/anmelden"
      userProfileProps={{
        additionalOAuthScopes: {
          google: ['profile', 'email'],
        }
      }}
    >
      <UserButton.MenuItems>
        {/* Eigene Organisationsverwaltung */}
        <UserButton.Link 
          href="/profile" 
          label="Meine Organisation" 
          labelIcon={<User className="h-4 w-4" />}
        />
        
        {/* Standard "Abmelden" Button an letzter Stelle */}
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  );
} 