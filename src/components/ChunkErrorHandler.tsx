'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChunkErrorHandler() {
  const router = useRouter()

  useEffect(() => {
    // Event-Listener für Chunk-Loading-Fehler
    const handleChunkError = (event: ErrorEvent) => {
      // Prüfe, ob es sich um einen Chunk-Loading-Fehler handelt
      if (event.error && (
        event.error.message.includes('ChunkLoadError') ||
        event.error.message.includes('Loading chunk') ||
        event.error.message.includes('webpack')
      )) {
        console.error('Chunk-Loading-Fehler erkannt:', event.error)
        
        // Verhindere, dass der Fehler weitergeht
        event.preventDefault()
        
        // Zeige eine benutzerfreundliche Fehlermeldung
        const shouldReload = window.confirm(
          'Es gab ein Problem beim Laden der Anwendung. ' +
          'Möchten Sie die Seite neu laden, um es zu beheben?'
        )
        
        if (shouldReload) {
          // Lösche den Browser-Cache und lade neu
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => {
                caches.delete(name)
              })
            })
          }
          
          // Lösche localStorage und sessionStorage
          localStorage.clear()
          sessionStorage.clear()
          
          // Lade die Seite neu
          window.location.reload()
        }
      }
    }

    // Event-Listener für unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && (
        event.reason.message?.includes('ChunkLoadError') ||
        event.reason.message?.includes('Loading chunk') ||
        event.reason.message?.includes('webpack')
      )) {
        console.error('Unhandled Promise Rejection (Chunk-Loading):', event.reason)
        
        // Verhindere, dass der Fehler weitergeht
        event.preventDefault()
        
        // Zeige eine benutzerfreundliche Fehlermeldung
        const shouldReload = window.confirm(
          'Es gab ein Problem beim Laden der Anwendung. ' +
          'Möchten Sie die Seite neu laden, um es zu beheben?'
        )
        
        if (shouldReload) {
          window.location.reload()
        }
      }
    }

    // Event-Listener hinzufügen
    window.addEventListener('error', handleChunkError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup-Funktion
    return () => {
      window.removeEventListener('error', handleChunkError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Diese Komponente rendert nichts, sie fügt nur Event-Listener hinzu
  return null
}
