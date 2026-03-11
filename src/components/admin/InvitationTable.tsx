'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Invitation {
  _id?: string;
  email: string;
  name: string;
  invitedByName: string;
  organizationId?: string;
  organizationName?: string;
  expiresAt: string | Date;
  createdAt: string | Date;
  used?: boolean;
  acceptedAt?: string | Date;
  revokedAt?: string | Date;
  reminder24hSentAt?: string | Date;
  reminder3dSentAt?: string | Date;
  mailDeliveryStatus?: string;
  lastMailEvent?: string;
  lastMailEventAt?: string | Date;
  lastMailError?: string;
}

type SortKey = 'name' | 'email' | 'invitedByName' | 'status' | 'createdAt' | 'expiresAt' | 'mail';
type SortDirection = 'asc' | 'desc';

function isAccepted(invitation: Invitation): boolean {
  return Boolean(invitation.acceptedAt || invitation.used);
}

function isRevoked(invitation: Invitation): boolean {
  return Boolean(invitation.revokedAt);
}

function isOverdue(invitation: Invitation): boolean {
  return new Date(invitation.expiresAt) < new Date();
}

function getOperationalKey(invitation: Invitation): string {
  const normalizedEmail = invitation.email.toLowerCase().trim();
  const orgKey = invitation.organizationId || 'none';
  return `${normalizedEmail}::${orgKey}`;
}

function getInvitationStatus(invitation: Invitation): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (invitation.revokedAt) return { label: 'Widerrufen', variant: 'destructive' };
  if (invitation.acceptedAt || invitation.used) return { label: 'Angenommen', variant: 'default' };
  if (isOverdue(invitation)) return { label: 'Offen (ueberfaellig)', variant: 'destructive' };
  return { label: 'Offen', variant: 'secondary' };
}

function getDeliveryLabel(invitation: Invitation): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  const status = invitation.mailDeliveryStatus || 'unbekannt';
  if (status === 'delivered' || status === 'opened' || status === 'clicked') {
    return { label: status, variant: 'default' };
  }
  if (status === 'blocked' || status === 'bounced' || status === 'spam' || status === 'error') {
    return { label: status, variant: 'destructive' };
  }
  return { label: status, variant: 'secondary' };
}

export function InvitationTable() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  async function fetchInvitations() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/invitations');
      if (!response.ok) throw new Error('Fehler beim Laden der Einladungen');
      const data = await response.json();
      setInvitations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Einladungen');
    } finally {
      setLoading(false);
    }
  }

  async function runAction(invitationId: string, action: 'remind' | 'revoke' | 'archive') {
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, action })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Aktion fehlgeschlagen');
      toast.success(result.message || 'Aktion erfolgreich');
      await fetchInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
    }
  }

  const filteredInvitations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return invitations;
    return invitations.filter((invitation) =>
      invitation.name.toLowerCase().includes(term) ||
      invitation.email.toLowerCase().includes(term) ||
      invitation.invitedByName.toLowerCase().includes(term)
    );
  }, [invitations, searchTerm]);

  function getSortLabel(invitation: Invitation): string {
    return getInvitationStatus(invitation).label;
  }

  function getSortMail(invitation: Invitation): string {
    return invitation.mailDeliveryStatus || 'unbekannt';
  }

  function compareBySort(a: Invitation, b: Invitation): number {
    switch (sortKey) {
      case 'name':
        return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
      case 'email':
        return a.email.localeCompare(b.email, 'de', { sensitivity: 'base' });
      case 'invitedByName':
        return a.invitedByName.localeCompare(b.invitedByName, 'de', { sensitivity: 'base' });
      case 'status':
        return getSortLabel(a).localeCompare(getSortLabel(b), 'de', { sensitivity: 'base' });
      case 'expiresAt':
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      case 'mail':
        return getSortMail(a).localeCompare(getSortMail(b), 'de', { sensitivity: 'base' });
      case 'createdAt':
      default:
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  }

  function applyDirection(value: number): number {
    return sortDirection === 'asc' ? value : -value;
  }

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === 'name' || nextKey === 'email' || nextKey === 'invitedByName' ? 'asc' : 'desc');
  }

  function SortableHead({ label, sortField }: { label: string; sortField: SortKey }) {
    const isActive = sortKey === sortField;
    const indicator = isActive ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
    return (
      <TableHead>
        <button
          type="button"
          onClick={() => toggleSort(sortField)}
          className="font-semibold hover:underline"
        >
          {label}{indicator}
        </button>
      </TableHead>
    );
  }

  const pendingInvitations = useMemo(() => {
    const pendingCandidates = filteredInvitations
      .filter((invitation) => !isAccepted(invitation) && !isRevoked(invitation));

    const latestPerUnit = new Map<string, Invitation>();
    for (const invitation of pendingCandidates) {
      const key = getOperationalKey(invitation);
      const current = latestPerUnit.get(key);
      if (!current || new Date(invitation.createdAt) > new Date(current.createdAt)) {
        latestPerUnit.set(key, invitation);
      }
    }

    return Array.from(latestPerUnit.values()).sort((a, b) => {
        const aOverdue = isOverdue(a);
        const bOverdue = isOverdue(b);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        return applyDirection(compareBySort(a, b));
      });
  }, [filteredInvitations, sortKey, sortDirection]);

  const acceptedInvitations = useMemo(() => {
    const acceptedCandidates = filteredInvitations
      .filter((invitation) => isAccepted(invitation));

    const latestAcceptedPerUnit = new Map<string, Invitation>();
    for (const invitation of acceptedCandidates) {
      const key = getOperationalKey(invitation);
      const current = latestAcceptedPerUnit.get(key);
      const invitationTime = invitation.acceptedAt ? new Date(invitation.acceptedAt).getTime() : new Date(invitation.createdAt).getTime();
      const currentTime = current
        ? (current.acceptedAt ? new Date(current.acceptedAt).getTime() : new Date(current.createdAt).getTime())
        : -1;
      if (!current || invitationTime > currentTime) {
        latestAcceptedPerUnit.set(key, invitation);
      }
    }

    return Array.from(latestAcceptedPerUnit.values()).sort((a, b) => applyDirection(compareBySort(a, b)));
  }, [filteredInvitations, sortKey, sortDirection]);

  useEffect(() => {
    fetchInvitations();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h2 className="text-2xl font-bold">Einladungen</h2>
        <Button variant="outline" size="sm" onClick={fetchInvitations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Nach Name, E-Mail oder Einladendem suchen..."
          className="pl-9"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Wartet auf Annahme</h3>
              <Badge variant="secondary">{pendingInvitations.length}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Name" sortField="name" />
                  <SortableHead label="E-Mail" sortField="email" />
                  <SortableHead label="Eingeladen von" sortField="invitedByName" />
                  <SortableHead label="Status" sortField="status" />
                  <SortableHead label="Erstellt" sortField="createdAt" />
                  <SortableHead label="Gueltig bis" sortField="expiresAt" />
                  <TableHead>Reminder</TableHead>
                  <SortableHead label="Mail" sortField="mail" />
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Keine offenen Einladungen.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingInvitations.map((invitation) => {
                    const id = String(invitation._id || '');
                    const status = getInvitationStatus(invitation);
                    const delivery = getDeliveryLabel(invitation);
                    const isActiveOpen = status.label === 'Offen';
                    return (
                      <TableRow key={id}>
                        <TableCell>{invitation.name}</TableCell>
                        <TableCell>
                          <div>{invitation.email}</div>
                          <div className="text-xs text-gray-500">{invitation.organizationName || 'Keine Organisation'}</div>
                        </TableCell>
                        <TableCell>{invitation.invitedByName}</TableCell>
                        <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                        <TableCell>{formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true, locale: de })}</TableCell>
                        <TableCell>{formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true, locale: de })}</TableCell>
                        <TableCell className="text-xs">
                          <div>24h: {invitation.reminder24hSentAt ? 'Ja' : 'Nein'}</div>
                          <div>3d: {invitation.reminder3dSentAt ? 'Ja' : 'Nein'}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={delivery.variant}>{delivery.label}</Badge>
                          {invitation.lastMailEventAt && (
                            <div className="text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(invitation.lastMailEventAt), { addSuffix: true, locale: de })}
                            </div>
                          )}
                          {invitation.lastMailError && (
                            <div className="text-red-600 mt-1 max-w-[180px] truncate" title={invitation.lastMailError}>
                              {invitation.lastMailError}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={!isActiveOpen} onClick={() => runAction(id, 'remind')}>
                              Erinnern
                            </Button>
                            <Button size="sm" variant="destructive" disabled={!isActiveOpen} onClick={() => runAction(id, 'revoke')}>
                              Widerrufen
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => runAction(id, 'archive')}>
                              Archivieren
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Angenommene Einladungen</h3>
              <Badge variant="default">{acceptedInvitations.length}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Name" sortField="name" />
                  <SortableHead label="E-Mail" sortField="email" />
                  <SortableHead label="Eingeladen von" sortField="invitedByName" />
                  <SortableHead label="Status" sortField="status" />
                  <SortableHead label="Erstellt" sortField="createdAt" />
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acceptedInvitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Keine angenommenen Einladungen.
                    </TableCell>
                  </TableRow>
                ) : (
                  acceptedInvitations.map((invitation) => {
                    const id = String(invitation._id || '');
                    const status = getInvitationStatus(invitation);
                    const delivery = getDeliveryLabel(invitation);
                    return (
                      <TableRow key={id}>
                        <TableCell>{invitation.name}</TableCell>
                        <TableCell>
                          <div>{invitation.email}</div>
                          <div className="text-xs text-gray-500">{invitation.organizationName || 'Keine Organisation'}</div>
                        </TableCell>
                        <TableCell>{invitation.invitedByName}</TableCell>
                        <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                        <TableCell>{formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true, locale: de })}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="secondary" onClick={() => runAction(id, 'archive')}>
                            Archivieren
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
