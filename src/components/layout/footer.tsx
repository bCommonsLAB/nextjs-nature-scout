import React from 'react';
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex overflow-hidden flex-col px-16 py-20 w-full bg-[#75825A] max-md:px-5 max-md:max-w-full">
      <div className="flex flex-col max-w-full w-[493px]">
        <div className="flex overflow-hidden flex-col max-w-[225px]">
          <Link href="/">
            <Image
              src="/images/naturescout-invert.svg"
              alt="NatureScout Logo"
              width={213}
              height={36}
              priority
              className="h-[36px] object-contain"
              style={{ width: 'auto' }}
            />
          </Link>
        </div>
        <p className="mt-8 text-sm font-medium leading-5 text-stone-50">
          Ein Projekt zur Förderung des Naturschutzes und der Biodiversität in
          Südtirol durch Bürgerbeteiligung und Wissenschaft.
        </p>
        <nav className="flex flex-wrap gap-8 items-start mt-8 w-full text-sm font-semibold text-stone-50">
          <Link href="/">Mitmachen</Link>
          <Link href="/">Blog lesen</Link>
          <Link href="/">Events</Link>
          <Link href="/">Spenden</Link>
        </nav>
      </div>
      <div className="flex flex-col mt-20 w-full text-sm text-stone-50 max-md:mt-10 max-md:max-w-full">
        <div className="flex w-full border border-solid bg-stone-50 border-stone-50 min-h-[1px]" />
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start mt-8 w-full">
          <div>© 2024 NatureScout. Alle Rechte vorbehalten.  Version: {process.env.VERSION}</div>
          <nav className="flex flex-wrap gap-4 items-start w-full md:w-auto">
            <Link href="/" className="underline decoration-auto decoration-solid underline-offset-auto">
              Datenschutzrichtlinie
            </Link>
            <Link href="/" className="underline decoration-auto decoration-solid underline-offset-auto">
              Nutzungsbedingungen
            </Link>
            <Link href="/" className="underline decoration-auto decoration-solid underline-offset-auto">
              Cookie-Einstellungen
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
