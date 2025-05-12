'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useState } from 'react';
import { OrganizationTable } from '@/components/admin/OrganizationTable';
import { useAdmin } from '@/hooks/use-admin';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export default function OrganizationsPage() {
  const { isAdmin, isLoading } = useAdmin();

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
          <Shield className="h-4 w-4" />
          <AlertTitle>Zugriff verweigert</AlertTitle>
          <AlertDescription>
            Du hast keine Administratorrechte für diese Seite.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Organisationsmanagement</CardTitle>
          <CardDescription>Verwalten Sie alle Organisationen in der Anwendung</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationTable />
        </CardContent>
      </Card>
    </div>
  );
} 