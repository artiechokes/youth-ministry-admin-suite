import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';

// Shared NextAuth config so route handlers and middleware stay in sync.
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    // Credentials provider works with JWT sessions.
    strategy: 'jwt'
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const identifier = credentials.email.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }, { username: identifier }]
          }
        });

        if (!user) return null;

        const passwordValid = await compare(credentials.password, user.passwordHash);
        if (!passwordValid) return null;

        return { id: user.id, email: user.email, role: user.role };
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    }
  },
  pages: {
    signIn: '/admin/login'
  }
};
