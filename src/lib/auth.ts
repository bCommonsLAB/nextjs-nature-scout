import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { UserService } from "@/lib/services/user-service"
import bcrypt from "bcryptjs"

export const authOptions = {
  // Konfiguration für Session-Management
  session: {
    strategy: "jwt" as const,
  },
  
  // Custom Pages - unsere eigenen Auth-Komponenten
  pages: {
    signIn: '/authentification/anmelden',
    signUp: '/authentification/registrieren',
    // error: '/authentification/fehler',
    // verifyRequest: '/authentification/email-bestaetigung',
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" }
      },
      async authorize(credentials) {
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