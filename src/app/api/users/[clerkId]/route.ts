import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

// GET /api/users/[clerkId] - Holt einen bestimmten Benutzer
export async function GET(
  req: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    // Benutzer dürfen nur ihre eigenen Daten abrufen, es sei denn, sie sind Admins
    if (userId !== params.clerkId) {
      const isAdmin = await UserService.isAdmin(userId);
      if (!isAdmin) {
        return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
      }
    }
    
    const user = await UserService.findByClerkId(params.clerkId);
    
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzers:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PATCH /api/users/[clerkId] - Aktualisiert einen bestimmten Benutzer
export async function PATCH(
  req: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    // Benutzer mit Admin-Rechten oder Benutzer, die ihre eigenen Daten aktualisieren
    const isAdmin = await UserService.isAdmin(userId);
    const isSelf = userId === params.clerkId;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }
    
    const body = await req.json();
    let { name, email, role } = body;
    
    // Normale Benutzer dürfen ihre Rolle nicht ändern
    if (!isAdmin) {
      role = undefined;
    }
    
    const updatedUser = await UserService.updateUser(params.clerkId, { 
      name, 
      email,
      ...(role && { role })
    });
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE /api/users/[clerkId] - Löscht einen bestimmten Benutzer
export async function DELETE(
  req: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    // Nur Admins dürfen Benutzer löschen
    const isAdmin = await UserService.isAdmin(userId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }
    
    const success = await UserService.deleteUser(params.clerkId);
    
    if (!success) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
} 