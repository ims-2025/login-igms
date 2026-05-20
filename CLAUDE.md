# IGMS Workspace — context for Claude

A self-hosted Confluence replacement for **iGaming Managed Services**. Built incrementally; see `PLAN.md` for the full roadmap and `README.md` for setup.

## Architecture

- Next.js 15 App Router + TypeScript
- Prisma + Postgres (Vercel Postgres / Neon in prod)
- Auth.js v5 (NextAuth) with JWT sessions
  - **Credentials** provider for staff (email + bcrypt password)
  - **Resend** provider for clients (magic link)
- Tailwind CSS with HSL-based brand tokens in `src/app/globals.css`
- shadcn-style components, written by hand (no shadcn CLI dependency)

## Auth model

- Three `Role`s: `ADMIN`, `STAFF`, `CLIENT`.
- Staff have **`StaffMembership`** rows per `ServiceArea` (`CRM`, `CUSTOMER_SUPPORT`, `DESIGN`, `AFFILIATION`, `MARKETING`, `PAYMENTS_FRAUD`) at a `StaffLevel` (`VIEWER`, `EDITOR`, `LEAD`).
- Clients have a `clientId` pointing at the `Client` row they belong to.
- Role + memberships are baked into the JWT in `src/auth.ts`. Read them via `auth()` in server components / `useSession()` in client components.
- All permission decisions go through `src/lib/permissions.ts` — never reimplement checks inline.

## Routing

- `(app)/` group = staff + admin routes (sidebar, internal nav).
- `(portal)/` group = client routes.
- `src/app/page.tsx` redirects to `/dashboard` or `/portal` based on role.
- Auth is enforced in three layers: `middleware.ts`, the group `layout.tsx`, and per-query `can*` checks. Belt + braces.

## Conventions

- All dates rendered via `formatDate` / `relativeTime` from `src/lib/utils.ts`.
- All Tailwind colours use the `brand-*` tokens (`bg-brand-surface`, `text-brand-muted`, etc.). Don't hard-code hex.
- Slugs generated via `slugify()`. Don't trust user-supplied slugs.
- Server actions live next to their pages and call into `src/lib/db.ts` (Prisma singleton).
- When in doubt, denser is better than airier — this is an internal tool.

## Don't

- Don't add a separate search service. Postgres `tsvector` + GIN is enough at this scale.
- Don't write to the database from client components — always go through a server action.
- Don't store anything sensitive client-side (no `localStorage` for tokens).
- Don't add a UI library. Plain Tailwind + the existing components is the house style.
