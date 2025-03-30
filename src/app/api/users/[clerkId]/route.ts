import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
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
    
    // Hole die clerkId mit await
    const clerkId = await params.clerkId;
    
    // Benutzer dürfen nur ihre eigenen Daten abrufen, es sei denn, sie sind Admins
    if (userId !== clerkId) {
      const isAdmin = await UserService.isAdmin(userId);
      if (!isAdmin) {
        return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
      }
    }
    
    const user = await UserService.findByClerkId(clerkId);
    
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
    
    // Hole die clerkId mit await
    const clerkId = await params.clerkId;
    
    // Benutzer mit Admin-Rechten oder Benutzer, die ihre eigenen Daten aktualisieren
    const isAdmin = await UserService.isAdmin(userId);
    const isSelf = userId === clerkId;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }
    
    const body = await req.json();
    const { name, email, role } = body;
    
    // Prüfen, ob dem aktuellen Benutzer die Admin-Rolle entzogen werden soll
    if (isAdmin && role && isSelf && role !== 'admin' && role !== 'superadmin') {
      // Prüfen, ob dieser Benutzer der letzte Admin ist
      const allUsers = await UserService.getAllUsers();
      const adminUsers = allUsers.filter(user => 
        (user.role === 'admin' || user.role === 'superadmin') && user.clerkId !== clerkId
      );
      
      // Wenn dies der letzte Admin ist, verweigere die Änderung
      if (adminUsers.length === 0) {
        return NextResponse.json({ 
          error: 'Diese Änderung kann nicht durchgeführt werden. Es muss mindestens ein Administrator im System verbleiben.',
          isLastAdmin: true 
        }, { status: 403 });
      }
    }
    
    // Normale Benutzer dürfen ihre Rolle nicht ändern
    const updateData = {
      ...(name !== undefined ? { name } : {}), 
      ...(email !== undefined ? { email } : {}),
      ...(isAdmin && role ? { role } : {})
    };
    
    const updatedUser = await UserService.updateUser(clerkId, updateData);
    
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
    
    // Hole die clerkId mit await
    const clerkId = await params.clerkId;
    
    // Nur Admins dürfen Benutzer löschen
    const isAdmin = await UserService.isAdmin(userId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }
    
    // Prüfen, ob der zu löschende Benutzer ein Admin ist
    const userToDelete = await UserService.findByClerkId(clerkId);
    if (userToDelete && (userToDelete.role === 'admin' || userToDelete.role === 'superadmin')) {
      // Prüfen, ob dies der letzte Admin ist
      const allUsers = await UserService.getAllUsers();
      const adminUsers = allUsers.filter(user => 
        (user.role === 'admin' || user.role === 'superadmin') && user.clerkId !== clerkId
      );
      
      // Wenn dies der letzte Admin ist, verweigere das Löschen
      if (adminUsers.length === 0) {
        return NextResponse.json({ 
          error: 'Der letzte Administrator kann nicht gelöscht werden. Es muss mindestens ein Administrator im System verbleiben.',
          isLastAdmin: true 
        }, { status: 403 });
      }
    }
    
    const success = await UserService.deleteUser(clerkId);
    
    if (!success) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
} 