import React from 'react';

export function Footer() {
  return (
    <footer className="flex overflow-hidden flex-col px-16 py-20 w-full bg-[#75825A] max-md:px-5 max-md:max-w-full">
      <div className="flex flex-col max-w-full w-[493px]">
        <div className="flex overflow-hidden flex-col max-w-full w-[225px]">
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/c4345af57a564f71b6050b95a82b3e60/aefe916433c0dafc3b59f12b6cebb8a78416cd8cfbf92a6bd00d976b65e8f93f?apiKey=c4345af57a564f71b6050b95a82b3e60&"
            alt="NatureScout Footer Logo"
            className="object-contain w-full aspect-[6.25]"
          />
        </div>
        <p className="mt-8 text-sm font-medium leading-5 text-stone-50">
          Ein Projekt zur Förderung des Naturschutzes und der Biodiversität in
          Südtirol durch Bürgerbeteiligung und Wissenschaft.
        </p>
        <nav className="flex flex-wrap gap-8 items-start mt-8 w-full text-sm font-semibold text-stone-50">
          <button>Mitmachen</button>
          <button>Blog lesen</button>
          <button>Events</button>
          <button>Spenden</button>
        </nav>
      </div>
      <div className="flex flex-col mt-20 w-full text-sm text-stone-50 max-md:mt-10 max-md:max-w-full">
        <div className="flex w-full border border-solid bg-stone-50 border-stone-50 min-h-[1px] max-md:max-w-full" />
        <div className="flex flex-wrap gap-10 justify-between items-start mt-8 w-full max-md:max-w-full">
          <div>© 2024 NatureScout. Alle Rechte vorbehalten.</div>
          <nav className="flex gap-6 items-start whitespace-nowrap min-w-[240px] max-md:max-w-full">
            <button className="underline decoration-auto decoration-solid underline-offset-auto">
              Datenschutzrichtlinie
            </button>
            <button className="underline decoration-auto decoration-solid underline-offset-auto">
              Nutzungsbedingungen
            </button>
            <button className="underline decoration-auto decoration-solid underline-offset-auto">
              Cookie-Einstellungen
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
