import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { UserService } from "@/lib/services/user-service"
import { LoginCodeService } from "@/lib/services/login-code-service"
import bcrypt from "bcryptjs"

export const authOptions = {
  // Konfiguration für Session-Management
  session: {
    strategy: "jwt" as const,
  },
  
  // Custom Pages - unsere eigenen Auth-Komponenten
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
    // error: '/auth/error',
    // verifyRequest: '/auth/email-verification',
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
        code: { label: "Code", type: "text" },
        loginType: { label: "Login Type", type: "text" },
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials) {
        // Prüfe Login-Typ
        if (credentials?.loginType === 'code') {
          // Code-Login
          if (!credentials?.email || !credentials?.code) {
            return null
          }

          try {
            // Code-Format prüfen (6-stellige Zahl)
            if (!/^\d{6}$/.test(credentials.code)) {
              return null
            }

            // Prüfe, ob der Code gültig ist
            const isValidCode = await LoginCodeService.validateCode(credentials.email, credentials.code)

            if (!isValidCode) {
              return null
            }

            // Finde den Benutzer
            const user = await UserService.findByEmail(credentials.email)

            if (!user) {
              return null
            }

            // Markiere den Code als verwendet
            await LoginCodeService.markCodeAsUsed(credentials.email, credentials.code)

            // Last Access aktualisieren
            await UserService.updateLastAccess(credentials.email)

            // User-Objekt für Session zurückgeben
            return {
              id: user._id?.toString() || '',
              email: user.email,
              name: user.name,
              role: user.role,
              image: user.image,
              organizationId: user.organizationId,
              organizationName: user.organizationName,
            }
          } catch (error) {
            console.error('Code-Login-Fehler:', error)
            return null
          }
        } else if (credentials?.loginType === 'invite') {
          // Token-basierte Einladungs-Anmeldung
          if (!credentials?.token) {
            return null
          }

          try {
            // Einladung validieren
            const invitation = await UserService.findInvitationByToken(credentials.token)
            
            if (!invitation) {
              return null
            }

            // Prüfen ob Einladung abgelaufen ist
            if (new Date() > invitation.expiresAt) {
              return null
            }

            // Benutzer finden oder erstellen
            let user = await UserService.findByEmail(invitation.email)
            
            if (!user) {
              // Neuen Benutzer ohne Passwort erstellen
              user = await UserService.createUser({
                email: invitation.email,
                name: invitation.name,
                role: 'user',
                organizationId: invitation.organizationId,
                organizationName: invitation.organizationName,
                consent_data_processing: false,
                consent_image_ccby: false,
                habitat_name_visibility: 'public'
              })
            }

            // Prüfen, ob Benutzer ein Passwort hat
            if (user.password) {
              return null // Benutzer mit Passwort müssen normal anmelden
            }

            // Last Access aktualisieren
            await UserService.updateLastAccess(invitation.email)

            // User-Objekt für Session zurückgeben
            return {
              id: user._id?.toString() || '',
              email: user.email,
              name: user.name,
              role: user.role,
              image: user.image,
              organizationId: user.organizationId,
              organizationName: user.organizationName,
            }
          } catch (error) {
            console.error('Invite-Login-Fehler:', error)
            return null
          }
        } else {
          // Passwort-Login
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          try {
            // Nutze unseren bestehenden UserService
            const user = await UserService.findByEmail(credentials.email)
            
            if (!user || !user.password) {
              return null
            }

            // Passwort prüfen
            const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
            
            if (!isPasswordValid) {
              return null
            }

            // Last Access aktualisieren (mit E-Mail)
            await UserService.updateLastAccess(user.email)

            // User-Objekt für Session zurückgeben
            return {
              id: user._id?.toString() || '',
              email: user.email,
              name: user.name,
              role: user.role,
              image: user.image,
              organizationId: user.organizationId,
              organizationName: user.organizationName,
            }
          } catch (error) {
            console.error('Auth-Fehler:', error)
            return null
          }
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      // Bei der ersten Anmeldung User-Daten in Token speichern
      if (user) {
        token.email = user.email
        token.role = user.role
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
      }
      return token
    },
    
    async session({ session, token }: { session: any; token: any }) {
      // User-Daten aus Token in Session übertragen
      if (token) {
        session.user.id = token.sub || ''
        session.user.email = token.email || ''
        session.user.role = token.role as string
        session.user.organizationId = token.organizationId as string
        session.user.organizationName = token.organizationName as string
      }
      return session
    }
  },

  // Sicherheitseinstellungen
  secret: process.env.NEXTAUTH_SECRET || 'temporary-secret-for-development-only',
}

export default NextAuth(authOptions) 