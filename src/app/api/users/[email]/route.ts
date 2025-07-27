import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'

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