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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IOrganization } from '@/lib/services/organization-service';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2, RefreshCw, AlertCircle, Edit, Plus } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Definiere das Formular-Schema mit Validierung
const organizationFormSchema = z.object({
  name: z.string().min(2, { message: 'Name muss mindestens 2 Zeichen lang sein' }),
  email: z.string().email({ message: 'Ungültige E-Mail-Adresse' }).optional(),
  logo: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  web: z.string().optional(),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export function OrganizationTable() {
  const [organizations, setOrganizations] = useState<IOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<IOrganization | null>(null);

  // React Hook Form initialisieren
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      email: '',
      logo: '',
      address: '',
      description: '',
      web: '',
    },
  });

  // Organisationen laden
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/organizations');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Organisationen');
      }
      const data = await response.json();
      setOrganizations(data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Organisationen');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Dialog zum Bearbeiten einer Organisation öffnen
  const openEditDialog = (organization: IOrganization) => {
    setSelectedOrganization(organization);
    form.reset({
      name: organization.name,
      email: organization.email,
      logo: organization.logo || '',
      address: organization.address || '',
      description: organization.description || '',
      web: organization.web || '',
    });
    setIsEditDialogOpen(true);
  };

  // Dialog zum Hinzufügen einer Organisation öffnen
  const openAddDialog = () => {
    setSelectedOrganization(null);
    form.reset({
      name: '',
      email: '',
      logo: '',
      address: '',
      description: '',
      web: '',
    });
    setIsAddDialogOpen(true);
  };

  // Organisation aktualisieren
  const updateOrganization = async (values: OrganizationFormValues) => {
    if (!selectedOrganization) return;
    
    try {
      const response = await fetch(`/api/organizations/${selectedOrganization._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Organisation');
      }

      // Nach erfolgreicher Aktualisierung: Liste neu laden und Dialog schließen
      await fetchOrganizations();
      setIsEditDialogOpen(false);
      
      toast.success('Organisation erfolgreich aktualisiert');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Organisation');
    }
  };

  // Neue Organisation erstellen
  const createOrganization = async (values: OrganizationFormValues) => {
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Organisation');
      }

      // Nach erfolgreicher Erstellung: Liste neu laden und Dialog schließen
      await fetchOrganizations();
      setIsAddDialogOpen(false);
      
      toast.success('Organisation erfolgreich erstellt');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Erstellen der Organisation');
    }
  };

  // Organisation löschen
  const deleteOrganization = async (id: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Organisation löschen möchten?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Organisation');
      }

      // Nach erfolgreicher Löschung: Liste neu laden
      await fetchOrganizations();
      
      toast.success('Organisation erfolgreich gelöscht');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Löschen der Organisation');
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Organisationsverwaltung</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchOrganizations}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Aktualisieren
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={openAddDialog}
          >
            <Plus className="h-4 w-4 mr-2" />
            Neue Organisation
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
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
              <TableHead className="w-[120px]">Logo</TableHead>
              <TableHead className="w-[300px]">Organisation</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="w-[150px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Keine Organisationen gefunden
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((organization) => (
                <TableRow key={organization._id?.toString()}>
                  <TableCell className="vertical-align-middle">
                    {organization.logo ? (
                      <div className="flex justify-center items-center h-[100px]">
                        <img 
                          src={organization.logo} 
                          alt={`Logo: ${organization.name}`} 
                          className="max-h-[100px] max-w-[100px] object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="h-[100px] flex items-center justify-center">
                        <span className="text-gray-400">Kein Logo</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <span className="font-bold text-base">{organization.name}</span>
                      {organization.email && (
                        <span className="text-sm text-gray-600">{organization.email}</span>
                      )}
                      {organization.web ? (
                        <a 
                          href={organization.web} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-blue-500 hover:underline flex items-center"
                        >
                          {organization.web}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">Keine Website</span>
                      )}
                      {organization.address && (
                        <span className="text-xs text-gray-500">{organization.address}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {organization.description ? (
                      <div className="line-clamp-3 text-sm">
                        {organization.description}
                      </div>
                    ) : (
                      <span className="text-gray-400">Keine Beschreibung</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(organization)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteOrganization(organization._id?.toString() || '')}
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

      {/* Organisation-Bearbeitungs-Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Organisation bearbeiten</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(updateOrganization)} className="space-y-6">
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      URL zu einem Bild (z.B. https://example.com/logo.png)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="web"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      URL zur Website (z.B. https://example.com)
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

      {/* Organisation-Hinzufügen-Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Neue Organisation hinzufügen</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(createOrganization)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      URL zu einem Bild (z.B. https://example.com/logo.png)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="web"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      URL zur Website (z.B. https://example.com)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
          
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit">Erstellen</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 