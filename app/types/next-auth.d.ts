
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      perfil: string
      codigo_vendedor?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    perfil: string
    codigo_vendedor?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    perfil: string
    codigo_vendedor?: string
  }
}
