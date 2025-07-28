import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      organizationId?: string
      organizationName?: string
      canInvite?: boolean

    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    organizationId?: string
    organizationName?: string
    canInvite?: boolean

  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    organizationId?: string
    organizationName?: string
    canInvite?: boolean
  }
} 