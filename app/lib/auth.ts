
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextAuthOptions } from 'next-auth';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        correo: { label: 'Correo', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { correo: credentials.correo }
          });

          if (!user || !user.activo) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.correo,
            name: user.nombre,
            perfil: user.perfil,
            codigo_vendedor: user.codigo_vendedor,
          };
        } catch (error) {
          console.error('Error during authentication:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.perfil = (user as any).perfil;
        token.codigo_vendedor = (user as any).codigo_vendedor;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).perfil = token.perfil;
        (session.user as any).codigo_vendedor = token.codigo_vendedor;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
