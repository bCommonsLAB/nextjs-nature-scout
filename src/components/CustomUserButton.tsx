'use client';

import { useEffect, useState } from 'react';
import { UserButton } from '@/components/auth/AuthComponents';
import { useTheme } from 'next-themes';

export function CustomUserButton() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full bg-gray-200"></div>;
  }

  const isDarkMode = resolvedTheme === 'dark';

  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        // baseTheme: isDarkMode ? dark : undefined,  // Temporär deaktiviert
        elements: {
          userButtonAvatarBox: 'w-8 h-8',
        },
      }}
    />
  );
} 