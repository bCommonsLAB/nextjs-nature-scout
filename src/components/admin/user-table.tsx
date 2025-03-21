'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { IUser } from '@/lib/db/models/user';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export function UserTable() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAdminError, setLastAdminError] = useState<string | null>(null);

  // Benutzer laden
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Benutzer');
      }
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Benutzer');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Benutzerrolle aktualisieren
  const updateUserRole = async (clerkId: string, role: string) => {
    setLastAdminError(null);
    try {
      const response = await fetch(`/api/users/${clerkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Prüfen, ob es sich um den letzten Admin handelt
        if (errorData.isLastAdmin) {
          setLastAdminError(errorData.error || 'Der letzte Administrator kann seine Rolle nicht ändern.');
          return;
        }
        
        throw new Error(errorData.error || 'Fehler beim Aktualisieren der Benutzerrolle');
      }

      // Nach erfolgreicher Aktualisierung: Liste neu laden
      await fetchUsers();
      
      toast.success('Benutzerrolle erfolgreich aktualisiert');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Benutzerrolle');
    }
  };

  // Benutzer löschen
  const deleteUser = async (clerkId: string) => {
    setLastAdminError(null);
    if (!confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${clerkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Prüfen, ob es sich um den letzten Admin handelt
        if (errorData.isLastAdmin) {
          setLastAdminError(errorData.error || 'Der letzte Administrator kann nicht gelöscht werden.');
          return;
        }
        
        throw new Error(errorData.error || 'Fehler beim Löschen des Benutzers');
      }

      // Nach erfolgreicher Löschung: Liste neu laden
      await fetchUsers();
      
      toast.success('Benutzer erfolgreich gelöscht');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Löschen des Benutzers');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Hilfstext zu den verschiedenen Rollen anzeigen
  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'user':
        return 'Standardbenutzer mit Lesezugriff';
      case 'biologe':
        return 'Biologe mit erweiterten Fachrechten';
      case 'admin':
        return 'Administrator mit vollen Rechten';
      case 'superadmin':
        return 'Superadministrator (höchste Stufe)';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Benutzerverwaltung</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchUsers}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Aktualisieren
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {lastAdminError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Achtung - Administrator-Schutz</AlertTitle>
          <AlertDescription>{lastAdminError}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Registriert</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Keine Benutzer gefunden
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.clerkId}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Select 
                        defaultValue={user.role} 
                        onValueChange={(value) => updateUserRole(user.clerkId, value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Rolle wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Benutzer</SelectItem>
                          <SelectItem value="biologe">Biologe</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Superadmin</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-gray-500">
                        {getRoleDescription(user.role)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(user.createdAt), { 
                      addSuffix: true,
                      locale: de
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteUser(user.clerkId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
} 