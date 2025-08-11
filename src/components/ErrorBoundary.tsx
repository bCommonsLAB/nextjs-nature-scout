'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, AlertCircle, Home, RotateCcw } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  isChunkError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      isChunkError: false 
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Prüfe, ob es sich um einen Chunk-Loading-Fehler handelt
    const isChunkError = error.message.includes('ChunkLoadError') || 
                        error.message.includes('Loading chunk') ||
                        error.message.includes('webpack')
    
    return { 
      hasError: true, 
      error, 
      isChunkError 
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Logge den Fehler für Debugging
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Details')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }

  handleRetry = () => {
    // Versuche die Seite neu zu laden
    window.location.reload()
  }

  handleClearCache = () => {
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

  render() {
    if (this.state.hasError) {
      // Fallback UI für Fehler
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Spezielle Behandlung für Chunk-Loading-Fehler
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-[#F7F9F4] to-[#E8F0E0] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-red-200 bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-4 rounded-full">
                    <AlertCircle className="h-10 w-10 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-red-800 mb-3">
                  Technischer Fehler aufgetreten
                </CardTitle>
                <CardDescription className="text-red-600">
                  Es gab ein Problem beim Laden der Anwendung
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-sm">
                    <strong>Chunk-Loading-Fehler:</strong> Ein Teil der Anwendung konnte nicht geladen werden.
                    Dies ist ein bekanntes Problem in der Entwicklungsumgebung.
                  </AlertDescription>
                </Alert>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    Lösungsvorschläge:
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Versuchen Sie die Seite neu zu laden</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Löschen Sie den Browser-Cache</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Starten Sie den Entwicklungsserver neu</span>
                    </li>
                  </ul>
                </div>
              </CardContent>

              <CardContent className="flex flex-col space-y-3">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Seite neu laden
                </Button>
                
                <Button 
                  onClick={this.handleClearCache}
                  variant="outline"
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Cache löschen & neu laden
                </Button>
                
                <Link href="/" className="w-full">
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Zur Startseite
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )
      }

      // Allgemeine Fehlerbehandlung
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#F7F9F4] to-[#E8F0E0] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-red-200 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <div className="bg-red-100 p-4 rounded-full">
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-800 mb-3">
                Ein Fehler ist aufgetreten
              </CardTitle>
              <CardDescription className="text-red-600">
                Die Anwendung konnte nicht korrekt geladen werden
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-sm">
                  {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-3">
                <Button 
                  onClick={this.handleRetry}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </Button>
                
                <Link href="/">
                  <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
                    <Home className="h-4 w-4 mr-2" />
                    Zur Startseite
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
