/**
 * Edge-safe Auth.js config — imported by middleware.ts.
 *
 * IMPORTANT: this file must not import anything that uses Node-only APIs
 * (Prisma client, bcryptjs, fs, etc.) because Next.js middleware runs in the
 * Edge runtime. The full provider list + DB-hydrating callbacks live in
 * src/auth.ts instead.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [], // real providers live in src/auth.ts
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const publicPaths = ["/login", "/api/auth"];
      if (publicPaths.some((p) => pathname.startsWith(p))) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
