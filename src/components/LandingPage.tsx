"use client";

import * as React from "react";
import { useState } from "react";
import { HabitatCard } from "./Landing/HabitatCard";
import { FeatureCard } from "./Landing/FeatureCard";
import { ProcessStep } from "./Landing/ProcessStep";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowRight   } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Sparkles } from "lucide-react";
import Link from 'next/link';
import { WelcomePopup } from "./welcome-popup";
console.log('LandingPage wird gerendert');

const colors = {
  lightest: "#FAFFF3",
  light: "#E9F5DB",
  medium: "#CFE1B9",
  mediumDark: "#9BA881",
  dark: "#637047",
  darkest: "#2D3321"
};

const features = [
  {
    iconSrc: "camera",
    title: "Lebensräume fotografieren",
    description: "Teilen Sie Ihre Beobachtungen und helfen Sie mit, besonders wertvolle Lebensräume zu identifizieren und zu dokumentieren."
  },
  {
    iconSrc: "map",
    title: "Wissenschaftlich verifizieren",
    description: "Die wissenschaftlich verifizierten Daten werden in den Geobrowser integriert und dienen als wertvolle Informationsgrundlage."
  },
  {
    iconSrc: "building",
    title: "Gemeinden informieren",
    description: "Gemeinden und relevante Behörden erhalten Zugang zu den Daten für fundierte Entscheidungen im Naturschutz."
  }
];


const habitats = [
  { 
    imageSrc: "/panoramasamples/magerwiese-artenreich.jpg", 
    title: "Magerwiese artenreich", 
    location: "Meran", 
    recorder: "Anna Mayer",
    status: "hochwertig",
    org: "AVS Meran"
  },
  { 
    imageSrc: "/panoramasamples/fettwiese-standard.jpg", 
    title: "Fettwiese", 
    location: "Brixen", 
    recorder: "Thomas Hofer",
    status: "standard",
    org: "Heimatpflegeverband Südtirol"
  },
  { 
    imageSrc: "/panoramasamples/verlandungsmoor.jpg", 
    title: "Verlandungsmoor", 
    location: "Bozen", 
    recorder: "Lisa Pichler",
    status: "gesetzlich",
    org: "Klima Club Südtirol"
  },
  { 
    imageSrc: "/panoramasamples/trockenrasen-kurzgrasig.jpg", 
    title: "Trockenrasen kurzgrasig", 
    location: "Schlanders", 
    recorder: "Michael Gruber",
    status: "gesetzlich",
    org: "Umweltschutzgruppe Vinschgau"
  }
];

const processSteps = [
  {
    iconSrc: "user",
    title: "Erfassung durch NatureScouts"
  },
  {
    iconSrc: "sparkles",
    title: "Automatische Voranalyse"
  },
  {
    iconSrc: "check",
    title: "Wissenschaftliche Bewertung"
  },
  {
    iconSrc: "database",
    title: "Integration Geobrowser"
  }
];

export function NatureScoutPage() {
  console.log('NatureScoutPage Component wird gerendert');

  const [showAIInfo, setShowAIInfo] = useState(false);

  return (
    <div className="flex overflow-hidden flex-col bg-black bg-opacity-20">
      <WelcomePopup />
      <div className="flex flex-col w-full max-md:max-w-full">
        <main>
          <section 
            className="relative flex overflow-hidden items-end px-16 pt-80 pb-24 min-h-[749px] max-md:px-5 max-md:pt-24"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('/images/Bergwiese.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="relative z-10 flex flex-col min-w-[240px] w-[560px]">
              <div className="flex flex-col w-full text-white max-md:max-w-full">
                <h1 className="text-6xl font-bold leading-[67px] max-md:max-w-full max-md:text-4xl max-md:leading-[54px]">
                  Schützen Sie die Biodiversität in Südtirol
                </h1>
                <p className="mt-6 text-lg leading-7 max-md:max-w-full">
                  Ein Citizen-Science Projekt des Dachverbands für Natur und
                  Umweltschutz in Südtirol. Helfen Sie mit, die biologische
                  Vielfalt Südtirols zu dokumentieren und zu schützen.
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-start self-start mt-8 text-base max-md:max-w-full">
                <Button 
                  size="lg"
                  variant="default"
                  className="min-w-[240px] w-full md:w-auto"
                >
                  Jetzt als NatureScout anmelden
                </Button>
                
                <Link href="/naturescout" className="w-full md:w-auto">
                  <Button 
                    size="lg"
                    variant="secondary"
                    className="min-w-[240px] w-full"
                  >
                    Jetzt ausprobieren
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="landing-section flex overflow-hidden flex-col px-16 py-24 w-full bg-[#D3E0BD] max-md:px-5">
            <h2>Ihre Rolle im Naturschutz</h2>
            <div>
              Viele Personen mit unterschiedlichsten Kompetenzen müssen zusammenwirken, damit es funktioniert.
            </div>
            <div className="container mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
                {features.map((feature, index) => (
                  <FeatureCard key={index} {...feature} />
                ))}
              </div>
            </div>
          </section>

          <section className="landing-section flex overflow-hidden flex-col px-16 py-16 w-full bg-[#FAFFF3] max-md:px-5">
            <h2>Zuletzt verifizierte Habitate</h2>
            <div>
              Diese Habitate wurden von engagierten Mitbürgern erfasst und Experten verifiziert
            </div>
            <div className="flex flex-col mt-10 w-full max-md:max-w-full">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full max-md:max-w-full">
                {habitats.map((habitat, index) => (
                  <React.Fragment key={index}>
                    <div className="aspect-w-16 aspect-h-9 w-full">
                      <HabitatCard {...habitat} />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <button className="gap-2 self-center px-6 py-3 mt-8 text-base text-white border border-solid bg-stone-400 border-stone-400 max-md:px-5">
              Weitere Habitate hier
            </button>
          </section>

          <section className="landing-section flex overflow-hidden flex-col px-16 pt-28 pb-16 w-full bg-[#E9F5DB] max-md:px-5 max-md:pt-24">
            <h2>Datenfluss und Qualitätssicherung</h2>
            <div className="mt-3 text-base leading-6 text-stone-900  mb-8 text-center">
              Die Schritte vom Erfassen der Habitate, verifizieren und informieren relevanter Institutionen
            </div>
            
            <div className="flex flex-col mt-20 w-full leading-9 text-center max-md:mt-10 max-md:max-w-full">
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 justify-center items-center w-full max-md:max-w-full">
                {processSteps.map((step, index) => (
                  <React.Fragment key={index}>
                    <ProcessStep {...step} />
                    {index < processSteps.length - 1 && (
                      <div className="hidden lg:block">
                        <ArrowRight size={32} className="text-stone-600" />
                      </div>
                    )}
                    {index < processSteps.length - 1 && (
                      <div className="lg:hidden">
                        <ArrowDown size={32} className="text-stone-600" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Smart Analysis Information Box */}
              <Card className={`mt-12 bg-[${colors.lightest}] border-[${colors.light}]`}>
                <CardContent className="p-4">
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setShowAIInfo(!showAIInfo)}
                  >
                    <Sparkles className={`w-5 h-5 text-[${colors.medium}]`} />
                    <h3 className={`font-medium text-[${colors.dark}]`}>Innovative Unterstützung der Wissenschaft</h3>
                    <Info className={`w-4 h-4 text-[${colors.medium}] ml-auto`} />
                  </div>
                  
                  {showAIInfo && (
                    <div className="mt-3 space-y-3 text-sm text-gray-600 text-left font-normal">
                      <p>
                        Modernste Computer-Vision-Systeme unterstützen die Voranalyse der Habitat-Aufnahmen. Diese smarte Technologie hilft, den Arbeitsaufwand der wissenschaftlichen Bewertung effizient zu gestalten.
                      </p>
                      <p>
                        Die intelligente Voranalyse ermöglicht es unseren Expert:innen, sich auf ihre Kernkompetenz zu konzentrieren: Die fachkundige Bewertung und Klassifizierung der Habitate.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          

        </main>
      </div>
    </div>
  );
}