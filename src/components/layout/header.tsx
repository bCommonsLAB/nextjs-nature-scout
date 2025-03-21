'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderArchive } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  return (
    <header className="bg-primary text-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1 md:space-x-6">
            <Link href="/" className="font-bold text-xl">
              NatureScout
            </Link>
            
            <nav className="flex space-x-1 md:space-x-4">
              <Link 
                href="/" 
                className={`px-2 py-1 rounded ${isActive('/') ? 'bg-primary-dark' : 'hover:bg-primary-dark'}`}
              >
                Start
              </Link>
              <Link 
                href="/archiv" 
                className={`px-2 py-1 rounded flex items-center ${isActive('/archiv') ? 'bg-primary-dark' : 'hover:bg-primary-dark'}`}
              >
                <FolderArchive className="h-4 w-4 mr-1" />
                <span>Archiv</span>
              </Link>
              <Link 
                href="/tests" 
                className={`px-2 py-1 rounded ${isActive('/tests') ? 'bg-primary-dark' : 'hover:bg-primary-dark'}`}
              >
                Tests
              </Link>
            </nav>
          </div>
          
          <div>
            <Link 
              href="/admin" 
              className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 