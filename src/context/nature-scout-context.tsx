"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NatureScoutData } from '@/types/nature-scout';

// Definiere den Typen für den Context
interface NatureScoutContextType {
  metadata: NatureScoutData | null;
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData | null>>;
  editJobId: string | null;
  setEditJobId: React.Dispatch<React.SetStateAction<string | null>>;
  jobId: string | null;
  setJobId: React.Dispatch<React.SetStateAction<string | null>>;
  // Aktive lokale (Offline-)Session-ID – gesetzt im Offline-Modus (Phase 2)
  localSessionId: string | null;
  setLocalSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  /** Wird bei „Neue Erfassung“ erhöht – NatureScout setzt lokalen Wizard-State zurück. */
  captureSessionKey: number;
  /** Entwurfs-/Offline-IDs im Context leeren (z. B. Navigation „Neues Habitat“). */
  resetCaptureSession: () => void;
}

// Erstelle den Context mit Defaultwerten
const NatureScoutContext = createContext<NatureScoutContextType>({
  metadata: null,
  setMetadata: () => {},
  editJobId: null,
  setEditJobId: () => {},
  jobId: null,
  setJobId: () => {},
  localSessionId: null,
  setLocalSessionId: () => {},
  captureSessionKey: 0,
  resetCaptureSession: () => {},
});

// Hook zum Verwenden des Contexts
export const useNatureScoutState = () => {
  return useContext(NatureScoutContext);
};

// Provider-Komponente
export function NatureScoutProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<NatureScoutData | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [captureSessionKey, setCaptureSessionKey] = useState(0);

  const resetCaptureSession = () => {
    setJobId(null);
    setEditJobId(null);
    setLocalSessionId(null);
    setCaptureSessionKey((k) => k + 1);
  };

  return (
    <NatureScoutContext.Provider
      value={{
        metadata,
        setMetadata,
        editJobId,
        setEditJobId,
        jobId,
        setJobId,
        localSessionId,
        setLocalSessionId,
        captureSessionKey,
        resetCaptureSession
      }}
    >
      {children}
    </NatureScoutContext.Provider>
  );
} 