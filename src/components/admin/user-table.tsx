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
import { Edit, Trash2, RefreshCw } from 'lucide-react';

export function UserTable() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const response = await fetch(`/api/users/${clerkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Benutzerrolle');
      }

      // Aktualisierter Benutzer
      const updatedUser = await response.json();
      
      // Benutzerliste aktualisieren
      setUsers(users.map(user => 
        user.clerkId === clerkId ? { ...user, role: updatedUser.role } : user
      ));
    } catch (err) {
      console.error(err);
      alert('Fehler beim Aktualisieren der Benutzerrolle');
    }
  };

  // Benutzer löschen
  const deleteUser = async (clerkId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${clerkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Benutzers');
      }

      // Benutzer aus der Liste entfernen
      setUsers(users.filter(user => user.clerkId !== clerkId));
    } catch (err) {
      console.error(err);
      alert('Fehler beim Löschen des Benutzers');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
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
                    <Select 
                      defaultValue={user.role} 
                      onValueChange={(value) => updateUserRole(user.clerkId, value)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Rolle wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Benutzer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
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