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
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister"

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
  applicationName: "NatureScout",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NatureScout",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  themeColor: "#4F7942",
  viewportFit: "cover" as const,
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
            <ServiceWorkerRegister />
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
