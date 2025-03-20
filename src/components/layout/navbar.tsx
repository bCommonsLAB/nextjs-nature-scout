import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Settings, TestTube2, FolderArchive, Users } from "lucide-react";
import { SignInButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

export function Navbar() {
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
          <Link href="/archiv">
            <Button variant="ghost" className="text-base">
              <FolderArchive className="h-4 w-4 mr-2" />
              Archiv
            </Button>
          </Link>
          <SignedIn>
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
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-10 w-10"
                }
              }}
            />
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
              <Link href="/archiv">
                <Button variant="ghost" className="w-full text-base justify-start">
                  <FolderArchive className="h-4 w-4 mr-2" />
                  Archiv
                </Button>
              </Link>
              <SignedIn>
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
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "h-10 w-10"
                      }
                    }}
                  />
                </div>
              </SignedIn>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}