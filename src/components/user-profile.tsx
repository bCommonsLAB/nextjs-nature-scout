"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";

export function UserProfileButton() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            userButtonPopoverCard: "!z-[9999]", // Wichtig: ! erzwingt die Style-Anwendung
            userButtonPopoverActions: "",
            userButtonPopoverActionButton: "!p-4 !text-base", // Größere Buttons mit mehr Abstand
          }
        }}
      />
    </div>
  );
} 