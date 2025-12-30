import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Browser- und Geräte-Erkennung für spezifische Anweisungen
export function detectBrowserEnvironment(): {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'unknown';
} {
  if (typeof window === 'undefined') {
    return { isMobile: false, isIOS: false, isAndroid: false, browser: 'unknown' };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);

  let browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'unknown' = 'unknown';
  if (userAgent.includes('edg/')) {
    browser = 'edge';
  } else if (userAgent.includes('chrome') && !userAgent.includes('edg/')) {
    browser = 'chrome';
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    browser = 'safari';
  } else if (userAgent.includes('firefox')) {
    browser = 'firefox';
  }

  return { isMobile, isIOS, isAndroid, browser };
}