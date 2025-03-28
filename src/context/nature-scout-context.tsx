"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NatureScoutData } from '@/types/nature-scout';

// Definiere den Typen für den Context
interface NatureScoutContextType {
  metadata: NatureScoutData | null;
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData | null>>;
  editJobId: string | null;
  setEditJobId: React.Dispatch<React.SetStateAction<string | null>>;
}

// Erstelle den Context mit Defaultwerten
const NatureScoutContext = createContext<NatureScoutContextType>({
  metadata: null,
  setMetadata: () => {},
  editJobId: null,
  setEditJobId: () => {},
});

// Hook zum Verwenden des Contexts
export const useNatureScoutState = () => {
  return useContext(NatureScoutContext);
};

// Provider-Komponente
export function NatureScoutProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<NatureScoutData | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);

  return (
    <NatureScoutContext.Provider 
      value={{ 
        metadata, 
        setMetadata,
        editJobId,
        setEditJobId
      }}
    >
      {children}
    </NatureScoutContext.Provider>
  );
} 