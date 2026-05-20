import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.hashedPassword || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.hashedPassword);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    Resend({
      from: process.env.AUTH_RESEND_FROM,
      apiKey: process.env.RESEND_API_KEY,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, hydrate the JWT with role + memberships
      if (user?.id) {
        token.id = user.id;
      }
      if (token.id && (!token.role || !token.memberships)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { memberships: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.clientId = dbUser.clientId;
          token.memberships = dbUser.memberships.map((m) => ({
            area: m.area,
            level: m.level,
          }));
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.clientId = token.clientId;
        session.user.memberships = token.memberships ?? [];
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const publicPaths = ["/login", "/api/auth"];
      if (publicPaths.some((p) => pathname.startsWith(p))) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
