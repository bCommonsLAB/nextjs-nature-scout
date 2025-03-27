"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";

export function UserProfileButton() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileOpened, setProfileOpened] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // Prüfen des Admin-Status
        const adminResponse = await fetch('/api/users/isAdmin');
        const adminData = await adminResponse.json();
        
        // Prüfen des Experten-Status
        const ExpertResponse = await fetch('/api/users/isExpert');
        const ExpertData = await ExpertResponse.json();

        // Rolle basierend auf Berechtigungen setzen
        if (adminData.isAdmin) {
          setUserRole('Admin');
        } else if (ExpertData.isExpert) {
          setUserRole('Experte');
        } else {
          setUserRole('Benutzer');
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Benutzerrolle:', error);
        setUserRole('Benutzer');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const getBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'Experte':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  // Debug-Logging für den UserButton
  const logUserAction = (action: string) => {
    console.log(`[Debug] User action: ${action}`);
    
    // Sende Event an Server für Logging
    fetch('/api/debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event: action, 
        component: 'UserProfile',
        userAgent: navigator.userAgent,
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
        timestamp: new Date().toISOString() 
      })
    }).catch(err => console.error("[Debug] Fehler beim Logging:", err));
  };

  // Event-Listener für das UserButton-Popup
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Überprüfe, ob auf "Konto verwalten" geklickt wurde
      const target = e.target as HTMLElement;
      if (target.textContent?.includes('Konto verwalten')) {
        logUserAction('account_manage_clicked');
      }
      
      // Überprüfe, ob auf "Ausloggen" geklickt wurde 
      if (target.textContent?.includes('Ausloggen')) {
        logUserAction('sign_out_clicked');
      }
    };
    
    document.addEventListener('click', handleClick);
    
    // Debug-Info in die Konsole schreiben
    console.log('[Debug] UserProfile geladen. Mobile:', /Mobi|Android/i.test(navigator.userAgent));
    logUserAction('profile_component_loaded');
    
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!isLoading && userRole && (
        <Badge className={`${getBadgeColor(userRole)} text-white`}>
          {userRole}
        </Badge>
      )}
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            userButtonAvatarBox: "h-10 w-10",
            userButtonTrigger: "focus:outline-none focus:ring-0",
            userButtonPopoverCard: "z-[1000]", // Höherer z-index für mobiles Popup
            userButtonPopoverActions: "cursor-pointer",
            userButtonPopoverActionButton: "min-h-[44px] block w-full px-4 py-3", // Größere Touch-Targets
          }
        }}
      />
    </div>
  );
} 