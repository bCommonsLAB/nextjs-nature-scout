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
import { IUser } from '@/lib/services/user-service';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2, RefreshCw, AlertCircle, Edit } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Definiere das Formular-Schema mit Validierung
const userFormSchema = z.object({
  name: z.string().min(2, { message: 'Name muss mindestens 2 Zeichen lang sein' }),
  email: z.string().email({ message: 'Ungültige E-Mail-Adresse' }).optional(),
  role: z.enum(['user', 'experte', 'admin', 'superadmin']),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export function UserTable() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAdminError, setLastAdminError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

  // React Hook Form initialisieren
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
    },
  });

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

  // Dialog zum Bearbeiten eines Benutzers öffnen
  const openEditDialog = (user: IUser) => {
    setSelectedUser(user);
    form.reset({
      name: user.name,
      email: user.email,
      role: user.role as 'user' | 'experte' | 'admin' | 'superadmin',
    });
    setIsEditDialogOpen(true);
  };

  // Benutzer aktualisieren
  const updateUser = async (values: UserFormValues) => {
    if (!selectedUser) return;
    
    setLastAdminError(null);
    try {
      const response = await fetch(`/api/users/${selectedUser.clerkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Prüfen, ob es sich um den letzten Admin handelt
        if (errorData.isLastAdmin) {
          setLastAdminError(errorData.error || 'Der letzte Administrator kann seine Rolle nicht ändern.');
          return;
        }
        
        throw new Error(errorData.error || 'Fehler beim Aktualisieren des Benutzers');
      }

      // Nach erfolgreicher Aktualisierung: Liste neu laden und Dialog schließen
      await fetchUsers();
      setIsEditDialogOpen(false);
      
      toast.success('Benutzer erfolgreich aktualisiert');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Benutzers');
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
      case 'experte':
        return 'Experte mit erweiterten Fachrechten';
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
                          <SelectItem value="experte">Experte</SelectItem>
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
                    {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { 
                      addSuffix: true,
                      locale: de
                    }) : 'Unbekannt'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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

      {/* Benutzer-Bearbeitungs-Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(updateUser)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-gray-100" />
                    </FormControl>
                    <FormDescription>
                      E-Mail-Adresse kann nicht geändert werden
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rolle</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Rolle auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Benutzer</SelectItem>
                        <SelectItem value="experte">Experte</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {getRoleDescription(field.value)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
          
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 