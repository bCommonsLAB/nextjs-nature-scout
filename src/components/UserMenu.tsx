'use client';

import { useState } from 'react';
import { useUser, useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut } from 'lucide-react';

export function UserMenu() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!isSignedIn) return null;

  // Die Initialen des Benutzers extrahieren
  const initials = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative w-9 h-9 rounded-full overflow-hidden">
          {user?.image ? (
            <div className="w-8 h-8 relative">
              <Image 
                src={user.image} 
                alt={user.name || "Benutzer"} 
                fill
                sizes="32px"
                className="rounded-full object-cover"
                priority
                loading="eager"
                fetchPriority="high"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
              {initials}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center p-2">
          <div className="flex items-center gap-2">
            {user?.image ? (
              <div className="w-8 h-8 relative">
                <Image 
                  src={user.image} 
                  alt={user.name || "Benutzer"} 
                  fill
                  sizes="32px"
                  className="rounded-full object-cover"
                  priority
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                {initials}
              </div>
            )}
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <Link href="/profile">
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Mein Profil</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => router.push('/profile')}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Profil bearbeiten</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
          onClick={() => signOut({ redirectUrl: '/' })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Ausloggen</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 