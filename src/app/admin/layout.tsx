import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Überprüfen, ob der Benutzer ein Admin ist
  const { userId } = await auth();
  
  // Sicherstellen, dass der Benutzer angemeldet ist
  if (!userId) {
    redirect('/sign-in');
  }
  
  // Die if-Abfrage stellt sicher, dass userId hier ein String ist
  const isAdmin = await UserService.isAdmin(userId as string);
  
  if (!isAdmin) {
    // Wenn kein Admin, zur Hauptseite umleiten
    redirect('/');
  }
  
  return (
    <div className="min-h-screen">
      <div className="bg-gray-100 py-4 px-6 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Admin-Bereich</h1>
      </div>
      {children}
    </div>
  );
} 