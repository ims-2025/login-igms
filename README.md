# IGMS Workspace

Self-hosted knowledge base + projects + light CRM for **iGaming Managed Services**. One app, role-based access. Staff log in with email + password; clients log in with a magic link.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Prisma · Postgres · Auth.js v5 · TipTap (added in Phase 4) · Resend (magic link) · Vercel.

---

## Current status

**Phase 1 complete** — scaffold + auth + role-aware shell + stub dashboards. The next phases (clients, projects, wiki, permissions, polish) layer on top of this foundation; see `PLAN.md` for the roadmap.

```
What works today
✓ Login page with two modes: staff password / client magic-link
✓ JWT sessions, role + service-area memberships on the session token
✓ Middleware-level auth on every route
✓ Role-aware sidebar (staff vs client navigation)
✓ Staff dashboard (counts, overdue list, recent activity)
✓ Client portal dashboard (their projects + shared pages)
✓ Prisma schema covers ALL phases — no migration churn later
✓ Admin seed script (creates you as Admin with every area at LEAD level)
```

---

## Setting it up the first time

### 1. Local development

```bash
# in /Users/cg/Documents/Claude/Projects/IGMS Confluence
npm install
cp .env.example .env.local
# edit .env.local — at minimum set DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:push      # creates the schema in your local/dev Postgres
npm run db:seed      # creates your admin user
npm run dev
```

Then open http://localhost:3000 and sign in with the `SEED_ADMIN_*` credentials from `.env.local`.

### 2. Deploy to Vercel

1. Push this folder to a new GitHub repo (private).
2. In Vercel → **New Project** → import the repo.
3. In the project, go to **Storage → Create → Postgres**. Vercel will pre-fill `DATABASE_URL` and `DIRECT_URL` (it now uses Neon under the hood — same Postgres).
4. Add the remaining env vars from `.env.example`:
   - `AUTH_SECRET` (run `openssl rand -base64 32`)
   - `AUTH_URL=https://login.igms.me`
   - `AUTH_TRUST_HOST=true`
   - `RESEND_API_KEY` + `AUTH_RESEND_FROM` (sign up at resend.com and verify the `igms.me` domain)
   - `SEED_ADMIN_*` for the first deploy
5. **Domains** → add `login.igms.me` and follow Vercel's DNS instructions in your GoDaddy panel (typically a CNAME to `cname.vercel-dns.com`).
6. The Vercel build automatically runs `prisma generate && next build`. After the first successful deploy, open the Vercel project → **Settings → Functions → Cron / one-off** (or use `vercel env pull` and run `npx prisma migrate deploy && npx prisma db seed` locally pointed at production DB) to apply migrations and seed the admin.

### 3. Resend setup (client magic-link emails)

1. Create a Resend account.
2. Add `igms.me` as a domain and add the DNS records Resend shows you (SPF / DKIM) in GoDaddy.
3. Once verified, create an API key → paste into `RESEND_API_KEY`.
4. Set `AUTH_RESEND_FROM="IGMS Workspace <noreply@igms.me>"`.

---

## Project structure

```
src/
├── auth.ts                     # Auth.js v5 config (credentials + Resend)
├── middleware.ts               # Route-level auth
├── lib/
│   ├── db.ts                   # Prisma singleton
│   ├── permissions.ts          # can(user, ...) helpers — every query routes through here
│   ├── services.ts             # Service-area enum labels
│   └── utils.ts                # cn(), slugify(), date helpers
├── components/
│   ├── sidebar.tsx             # role-aware nav
│   ├── topbar.tsx              # page header
│   ├── session-provider.tsx    # next-auth/react context
│   └── login-form.tsx          # tabbed staff/client login
├── app/
│   ├── layout.tsx              # root HTML
│   ├── globals.css             # theme tokens (brand colours)
│   ├── page.tsx                # root → role-based redirect
│   ├── login/page.tsx
│   ├── api/auth/[...nextauth]/route.ts
│   ├── (app)/                  # staff/admin routes
│   │   ├── layout.tsx          # auth guard + sidebar
│   │   ├── dashboard/page.tsx  # ← landing page after login
│   │   ├── clients/page.tsx    # placeholder (Phase 2)
│   │   ├── projects/page.tsx   # placeholder (Phase 3)
│   │   └── wiki/page.tsx       # placeholder (Phase 4)
│   └── (portal)/               # client routes
│       ├── layout.tsx
│       └── portal/page.tsx     # client landing
├── types/
│   └── next-auth.d.ts          # extends Session with role/memberships
prisma/
├── schema.prisma               # complete model (all phases)
└── seed.ts                     # creates admin + areas + base spaces
```

---

## Theming

Brand colours live as HSL triplets in `src/app/globals.css` (`:root`). When you confirm the real IGMS palette I'll update those four lines (`--brand-accent`, `--brand-bg`, `--brand-surface`, `--brand-border`) and the whole app re-themes. No other CSS changes needed.

---

## Importing from Confluence Cloud

Workspace: `https://igamingmanagedservices.atlassian.net`. The importer hits Confluence Cloud's REST API v2, preserves page hierarchy, and maps known space keys (`AFF`, `CRM`, `CS`, `DSGN`, `MKT`, `PNF`, …) to our internal service areas.

```bash
# 1. Add these to .env.local (the API token is a SECRET — never commit it)
CONFLUENCE_BASE_URL="https://igamingmanagedservices.atlassian.net"
CONFLUENCE_EMAIL="onlineprojects@pm.me"
CONFLUENCE_API_TOKEN="ATATT...."        # from id.atlassian.com/manage-profile/security/api-tokens

# 2. Dry-run on a single space first to verify the connection
CONFLUENCE_SPACE_KEY=AFF CONFLUENCE_DRY_RUN=true npm run import:confluence

# 3. Real import of one space
CONFLUENCE_SPACE_KEY=AFF npm run import:confluence

# 4. Once you're happy, import everything
npm run import:confluence
```

The importer is idempotent — running it again updates existing pages by `(space, slug)` and refreshes their content. Each imported page records `externalSource = "confluence:<pageId>"` so you can trace it back later.

The space-key → service-area mapping lives in `scripts/import-confluence.ts` (`SPACE_KEY_TO_AREA`). Update it if your actual space keys differ from the defaults.

---

## What's next

- **Phase 2** — clients table, detail page, contacts, activity log, services.
- **Phase 3** — projects kanban + list, notes, due-date filtering.
- **Phase 4** — wiki spaces, hierarchical pages, TipTap editor, full-text search. Confluence content already imported becomes browsable/editable.
- **Phase 5** — wire up real per-area enforcement on every query; build the client-share UI on pages.
- **Phase 6** — export to Markdown/JSON, attachments, polish, prod deploy.

See `PLAN.md` for the full plan.
