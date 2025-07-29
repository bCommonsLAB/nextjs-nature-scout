import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { checkAdminAccess } from '@/lib/server-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email: emailParam } = await params
    const email = decodeURIComponent(emailParam)

    if (!email) {
      return NextResponse.json(
        { message: 'E-Mail-Adresse ist erforderlich.' },
        { status: 400 }
      )
    }

    // Benutzer in der Datenbank finden
    const user = await UserService.findByEmail(email.toLowerCase().trim())

    if (!user) {
      return NextResponse.json(
        { message: 'Benutzer nicht gefunden.' },
        { status: 404 }
      )
    }

    // Nur sichere Daten zurückgeben (kein Passwort-Hash)
    return NextResponse.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      canInvite: user.canInvite || false,
      hasPassword: !!user.password,
      createdAt: user.createdAt,
      lastAccess: user.lastAccess
    })
  } catch (error) {
    console.error('Benutzer-Abfragefehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[email] - Aktualisiert spezifische Benutzerfelder (nur für Admins)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Admin-Authentifizierung prüfen
    const { isAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }

    const { email: emailParam } = await params
    const email = decodeURIComponent(emailParam)
    const body = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'E-Mail-Adresse ist erforderlich.' },
        { status: 400 }
      )
    }

    // Benutzer aktualisieren
    const updatedUser = await UserService.updateUser(email, body)

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Benutzer nicht gefunden.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Benutzer erfolgreich aktualisiert.',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
        organizationName: updatedUser.organizationName,
        canInvite: updatedUser.canInvite || false
      }
    })
  } catch (error) {
    console.error('Benutzer-Aktualisierungsfehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[email] - Löscht einen Benutzer (nur für Admins)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Admin-Authentifizierung prüfen
    const { isAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }

    const { email: emailParam } = await params
    const email = decodeURIComponent(emailParam)

    if (!email) {
      return NextResponse.json(
        { message: 'E-Mail-Adresse ist erforderlich.' },
        { status: 400 }
      )
    }

    // Prüfen, ob es der letzte Admin ist
    const user = await UserService.findByEmail(email)
    if (!user) {
      return NextResponse.json(
        { message: 'Benutzer nicht gefunden.' },
        { status: 404 }
      )
    }

    // Überprüfen, ob dies der letzte Admin ist
    if (user.role === 'admin' || user.role === 'superadmin') {
      const adminCount = await UserService.getAdminCount()
      if (adminCount <= 1) {
        return NextResponse.json(
          { 
            error: 'Der letzte Administrator kann nicht gelöscht werden.',
            isLastAdmin: true 
          },
          { status: 400 }
        )
      }
    }

    // Benutzer löschen
    const deleted = await UserService.deleteUser(email)

    if (!deleted) {
      return NextResponse.json(
        { message: 'Benutzer konnte nicht gelöscht werden.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Benutzer erfolgreich gelöscht.'
    })
  } catch (error) {
    console.error('Benutzer-Löschfehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
} 