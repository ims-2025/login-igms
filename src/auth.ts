import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
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
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      const t = token as {
        id?: string;
        role?: unknown;
        clientId?: string | null;
        memberships?: unknown;
      } & typeof token;

      // On sign-in, store the user id on the token.
      if (user?.id) {
        t.id = user.id;
      }
      // Hydrate role + memberships from DB if missing (runs in the Node API
      // route, not the Edge middleware).
      if (t.id && (!t.role || !t.memberships)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: t.id },
          include: { memberships: true },
        });
        if (dbUser) {
          t.role = dbUser.role;
          t.clientId = dbUser.clientId;
          t.memberships = dbUser.memberships.map((m) => ({
            area: m.area,
            level: m.level,
          }));
        }
      }
      return t;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Auth.js v5's callback types treat JWT fields as `unknown` even with
        // module augmentation, so we cast at this boundary. The shape is
        // guaranteed by the jwt() callback above.
        const t = token as {
          id?: string;
          role?: typeof session.user.role;
          clientId?: string | null;
          memberships?: typeof session.user.memberships;
        };
        session.user.id = t.id ?? "";
        session.user.role = t.role ?? "STAFF";
        session.user.clientId = t.clientId ?? null;
        session.user.memberships = t.memberships ?? [];
      }
      return session;
    },
  },
});
