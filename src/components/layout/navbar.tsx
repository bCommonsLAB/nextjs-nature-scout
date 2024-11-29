import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export function Navbar() {
  return (
    <header className="flex flex-col justify-center px-16 w-full bg-stone-50 min-h-[72px] max-md:px-5">
      <nav className="flex flex-wrap gap-10 justify-between items-center w-full">
        <div className="flex justify-center items-center self-stretch my-auto max-w-[198px]">
          <Link href="/">
            <Image
              src="/images/naturescout.svg"
              alt="NatureScout Logo"
              width={213}
              height={36}
              priority
              className="w-auto h-[36px] object-contain"
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
          <Link href="/">
            <Button variant="secondary" className="text-base">
              Jetzt Anmelden
            </Button>
          </Link>
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
              <Link href="/">
                <Button variant="secondary" className="w-full text-base justify-start">
                  Jetzt Anmelden
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}