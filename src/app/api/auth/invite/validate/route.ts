import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token fehlt.' },
        { status: 400 }
      )
    }

    // Token validieren
    const invitation = await UserService.findInvitationByToken(token)
    
    if (!invitation) {
      return NextResponse.json(
        { success: false, message: 'Ungültiger oder abgelaufener Einladungslink.' },
        { status: 404 }
      )
    }

    // Prüfen ob E-Mail bereits registriert ist
    const existingUser = await UserService.findByEmail(invitation.email)
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Diese E-Mail-Adresse ist bereits registriert.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      invitation: {
        name: invitation.name,
        email: invitation.email,
        inviterName: invitation.invitedByName,
        organizationName: invitation.organizationName
      }
    })

  } catch (error) {
    console.error('Fehler bei der Token-Validierung:', error)
    return NextResponse.json(
      { success: false, message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
} 