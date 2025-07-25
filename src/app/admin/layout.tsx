import { redirect } from 'next/navigation';
import { UserService } from '@/lib/services/user-service';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TEMPORÄR: Demo-Admin für Schritt 1 (Clerk Decoupling)
  const userId = 'demo-user-123';
  const isAdmin = true; // TEMPORÄR: Demo-Admin-Zugang
  
  // In Schritt 2 wird echte Auth.js Authentifizierung implementiert
  // if (!userId) {
  //   redirect('/sign-in');
  // }
  // const isAdmin = await UserService.isAdmin(userId as string);
  // if (!isAdmin) {
  //   redirect('/');
  // }
  
  return (
    <div className="min-h-screen">
      <div className="bg-gray-100 py-4 px-6 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Admin-Bereich</h1>
      </div>
      {children}
    </div>
  );
} 