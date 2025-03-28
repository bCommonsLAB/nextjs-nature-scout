import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from '@/components/layout/footer';  
import '../styles/leaflet-custom.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css'; // CSS für Leaflet Draw
import './leaflet-custom.css';  // Ihre custom Styles
import { ClerkProvider } from "@clerk/nextjs";
import { deDE } from '@clerk/localizations'
import { NatureScoutProvider } from "@/context/nature-scout-context";

const customLocalization = {
  ...deDE,
  signIn: {
    ...deDE.signIn,
    start: {
      ...deDE.signIn?.start,
      title: "Anmelden bei NatureScout",
      subtitle: "Willkommen zurück! Bitte melden Sie sich an, um fortzufahren",
    },
  },
};

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Nature Scout",
  description: "Habitate finden und bewerten",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={customLocalization}>
      <html lang="de">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        >
          <NatureScoutProvider>
            <Navbar />
            <main>
              {children}
            </main>
            <Footer />
          </NatureScoutProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
