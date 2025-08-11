import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/layout/navigationbar";
import { Footer } from '@/components/layout/footerbar';  
import '../styles/leaflet-custom.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css'; // CSS für Leaflet Draw
import './leaflet-custom.css';  // Ihre custom Styles
import { AuthProviders } from "@/components/providers/AuthProviders"
import ErrorBoundary from "@/components/ErrorBoundary"
import ChunkErrorHandler from "@/components/ChunkErrorHandler"

// const customLocalization = {
//   ...deDE,
//   signIn: {
//     ...deDE.signIn,
//     start: {
//       ...deDE.signIn?.start,
//       title: "Anmelden bei NatureScout",
//       subtitle: "Willkommen zurück! Bitte melden Sie sich an, um fortzufahren",
//     },
//   },
// };

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
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ErrorBoundary>
          <AuthProviders>
            <ChunkErrorHandler />
            <Navbar />
            <main>
              {children}
            </main>
            <Footer />
          </AuthProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
