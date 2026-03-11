'use client';

import { useEffect, useState } from 'react';
import { UserTable } from '@/components/admin/UserTable';
import { InvitationTable } from '@/components/admin/InvitationTable';
import { useAdmin } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldAlert, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, isLoading, makeAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    setActiveTab(tab === 'invitations' ? 'invitations' : 'users');
  }, []);

  const handleMakeAdmin = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    
    try {
      await makeAdmin();
      setActionSuccess('Du wurdest erfolgreich zum Administrator gemacht!');
    } catch (err) {
      console.error('Admin-Rechte Fehler:', err);
      setActionError('Fehler beim Erteilen von Admin-Rechten.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Zugriff verweigert</AlertTitle>
          <AlertDescription>
            Du hast keine Administratorrechte für diese Seite.
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={handleMakeAdmin} 
          disabled={actionLoading}
        >
          {actionLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Shield className="h-4 w-4 mr-2" />
          )}
          Zum Administrator machen
        </Button>
        
        {actionError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}
        
        {actionSuccess && (
          <Alert className="mt-4 bg-green-50 text-green-800 border-green-200">
            <AlertDescription>{actionSuccess}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = value === 'invitations' ? 'invitations' : 'users';
          setActiveTab(nextTab);
          router.push(`/admin/users?tab=${nextTab}`);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Benutzer</TabsTrigger>
          <TabsTrigger value="invitations">Einladungen</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserTable />
        </TabsContent>
        <TabsContent value="invitations">
          <InvitationTable />
        </TabsContent>
      </Tabs>
    </div>
  );
} 