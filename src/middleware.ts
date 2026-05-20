import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware uses the Edge-safe config only. Heavy providers + DB-hydrating
// callbacks live in src/auth.ts and run in the Node runtime via the API
// handlers.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Run on everything except Next internals + static assets
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?)$).*)",
  ],
};
