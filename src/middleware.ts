export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Run on everything except Next internals + static assets
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?)$).*)",
  ],
};
