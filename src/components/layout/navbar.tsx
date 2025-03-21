"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Settings, TestTube2, Folder, Users } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { UserProfileButton } from "@/components/user-profile";

export function Navbar() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  // Überprüfe, ob der Benutzer Admin-Rechte hat
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isLoaded && user) {
        try {
          const response = await fetch(`/api/users/isAdmin`);
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Fehler beim Überprüfen des Admin-Status:', error);
          setIsAdmin(false);
        }
      }
    };

    checkAdminStatus();
  }, [isLoaded, user]);

  return (
    <header className="flex flex-col justify-center px-16 w-full bg-stone-50 min-h-[72px] max-md:px-5">
      <nav className="flex flex-wrap gap-10 justify-between items-center w-full">
        <div className="flex justify-center items-center self-stretch my-auto max-w-[198px]">
          <Link href="/">
            <Image
              src="/images/naturescout-normal.svg"
              alt="NatureScout Logo"
              width={213}
              height={36}
              priority
              className="h-[36px] object-contain"
              style={{ width: 'auto' }}
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-8 justify-center items-center self-stretch my-auto">
          <Link href="/">
            <Button variant="ghost" className="text-base">
              Über Uns
            </Button>
          </Link>
          <SignedIn>
            <Link href="/habitat">
              <Button variant="ghost" className="text-base">
                <Folder className="h-4 w-4 mr-2" />
                Habitate
              </Button>
            </Link>
          </SignedIn>
          <SignedIn>
            {isAdmin && (
              <>
                <Link href="/admin/config">
                  <Button variant="ghost" className="text-base">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </Link>
                <Link href="/admin/users">
                  <Button variant="ghost" className="text-base">
                    <Users className="h-4 w-4 mr-2" />
                    Benutzer
                  </Button>
                </Link>
              </>
            )}
          </SignedIn>
          <Link href="/tests">
            <Button variant="ghost" className="text-base">
              <TestTube2 className="h-4 w-4 mr-2" />
              Tests
            </Button>
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="secondary" className="text-base">
                Jetzt Anmelden
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserProfileButton />
          </SignedIn>
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle className="text-left mb-4">
              Navigation
            </SheetTitle>
            <div className="flex flex-col gap-4">
              <Link href="/">
                <Button variant="ghost" className="w-full text-base justify-start">
                  Über Uns
                </Button>
              </Link>
              <SignedIn>
                <Link href="/habitat">
                  <Button variant="ghost" className="w-full text-base justify-start">
                    <Folder className="h-4 w-4 mr-2" />
                    Habitat
                  </Button>
                </Link>
              </SignedIn>
              <SignedIn>
                {isAdmin && (
                  <>
                    <Link href="/admin/config">
                      <Button variant="ghost" className="w-full text-base justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                    <Link href="/admin/users">
                      <Button variant="ghost" className="w-full text-base justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Benutzer
                      </Button>
                    </Link>
                  </>
                )}
              </SignedIn>
              <Link href="/tests">
                <Button variant="ghost" className="w-full text-base justify-start">
                  <TestTube2 className="h-4 w-4 mr-2" />
                  Tests
                </Button>
              </Link>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="secondary" className="w-full text-base justify-start">
                    Jetzt Anmelden
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="pt-2 pl-2">
                  <UserProfileButton />
                </div>
              </SignedIn>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}