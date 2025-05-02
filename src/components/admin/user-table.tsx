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
import { Trash2, RefreshCw, AlertCircle, Edit, X, Filter, Search } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAdminError, setLastAdminError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  
  // Filter-Status
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [registerDateFilter, setRegisterDateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<{type: string; value: string}[]>([]);

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
      setAllUsers(data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Benutzer');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Benutzer filtern basierend auf den aktuellen Filtern
  useEffect(() => {
    let result = [...allUsers];
    
    // Filtern nach Rolle
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }
    
    // Filtern nach Registrierungsdatum
    if (registerDateFilter !== 'all') {
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;
      
      result = result.filter(user => {
        if (!user.createdAt) return false;
        
        const createdDate = new Date(user.createdAt);
        const diffTime = now.getTime() - createdDate.getTime();
        
        switch (registerDateFilter) {
          case 'today':
            return diffTime < oneDay;
          case 'week':
            return diffTime < oneWeek;
          case 'month':
            return diffTime < oneMonth;
          default:
            return true;
        }
      });
    }
    
    // Suche nach Name oder E-Mail
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.name.toLowerCase().includes(term) || 
        (user.email && user.email.toLowerCase().includes(term))
      );
    }
    
    setFilteredUsers(result);
    
    // Aktive Filter aktualisieren
    const newActiveFilters = [];
    
    if (roleFilter !== 'all') {
      const roleName = {
        'user': 'Benutzer',
        'experte': 'Experte',
        'admin': 'Admin',
        'superadmin': 'Superadmin'
      }[roleFilter] || roleFilter;
      
      newActiveFilters.push({ type: 'role', value: `Rolle: ${roleName}` });
    }
    
    if (registerDateFilter !== 'all') {
      const dateFilterName = {
        'today': 'Heute',
        'week': 'Letzte Woche',
        'month': 'Letzter Monat'
      }[registerDateFilter] || registerDateFilter;
      
      newActiveFilters.push({ type: 'date', value: `Registriert: ${dateFilterName}` });
    }
    
    if (searchTerm.trim()) {
      newActiveFilters.push({ type: 'search', value: `Suche: ${searchTerm}` });
    }
    
    setActiveFilters(newActiveFilters);
    
  }, [allUsers, roleFilter, registerDateFilter, searchTerm]);

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
  
  // Filter entfernen
  const removeFilter = (type: string) => {
    switch (type) {
      case 'role':
        setRoleFilter('all');
        break;
      case 'date':
        setRegisterDateFilter('all');
        break;
      case 'search':
        setSearchTerm('');
        break;
    }
  };
  
  // Alle Filter zurücksetzen
  const resetAllFilters = () => {
    setRoleFilter('all');
    setRegisterDateFilter('all');
    setSearchTerm('');
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

      {/* Filter-Steuerelemente */}
      <div className="flex flex-col space-y-4">
        {/* Aktive Filter-Anzeige */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetAllFilters} className="h-8 text-xs">
                Filter zurücksetzen
              </Button>
            )}
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer px-3 py-1">
                <span>{filter.value}</span>
                <X 
                  className="ml-2 h-3 w-3 text-gray-500 hover:text-red-500"
                  onClick={() => removeFilter(filter.type)}
                />
              </Badge>
            ))}
          </div>
        )}
        
        {/* Filter-Leiste */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Rolle filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Rollen</SelectItem>
              <SelectItem value="user">Benutzer</SelectItem>
              <SelectItem value="experte">Experte</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={registerDateFilter} onValueChange={setRegisterDateFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Registrierungsdatum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Zeiträume</SelectItem>
              <SelectItem value="today">Heute registriert</SelectItem>
              <SelectItem value="week">Letzte Woche</SelectItem>
              <SelectItem value="month">Letzter Monat</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              type="text"
              placeholder="Nach Name oder E-Mail suchen..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>
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
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  {activeFilters.length > 0 
                    ? 'Keine Benutzer mit diesen Filterkriterien gefunden' 
                    : 'Keine Benutzer gefunden'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
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