# IGMS Workspace — Build Plan

A self-hosted Confluence-style knowledge base + lightweight project & client workspace for **iGaming Managed Services (IGMS)**. Internal staff and clients log in to the same app; role-based access decides what each person sees.

---

## 1. Decisions locked in

| Area | Choice |
|---|---|
| Hosting | Vercel + managed Postgres (Neon or Vercel Postgres) |
| Auth model | One app, role-based access (staff + clients on same login) |
| Staff permissions | By **service area** (CRM, Customer Support, Design, Affiliation, Marketing, Payments & Fraud) × **level** (Viewer / Editor / Lead). Plus a global Admin role. |
| Client experience | Per-client dashboard (their projects + status) + wiki pages explicitly shared with them |
| Scale | 10–30 clients, ~10–30 staff users (small, internal) |

---

## 2. Tech stack

**Framework**
- **Next.js 15** (App Router) + **TypeScript**
- **React Server Components** for fast initial loads; server actions for mutations
- **Tailwind CSS** + **shadcn/ui** — gives you a dense, professional look without designing from scratch

**Data**
- **Postgres** (Neon free tier is fine for this size — promotes well later)
- **Prisma** ORM — clean schema definition, type-safe queries, easy migrations
- **Postgres full-text search** via `tsvector` columns + GIN indexes. No external search service needed at this scale.

**Auth**
- **Auth.js (NextAuth v5)** — email/password (credentials) + magic-link email
- Sessions stored in Postgres
- Middleware-level route protection + per-query permission checks

**Editor**
- **TipTap** (built on ProseMirror) — gives you Notion-style editing: headings, tables, code blocks, task lists, inline links to other wiki pages, image embeds. Content is stored as JSON (preserves structure) plus a denormalized plain-text column for search.

**File storage**
- **Vercel Blob** (or S3-compatible like Cloudflare R2) for attachments, contracts, reports

**Email**
- **Resend** for magic-link emails and notifications (optional)

**Why this stack:** zero ops to start (deploy = `git push`), all serverless-friendly, every piece is mainstream and easy to replace if you outgrow it. No exotic dependencies.

---

## 3. Data model

```
User
  id, email (unique), name, hashedPassword?, image
  role: ADMIN | STAFF | CLIENT
  clientId?   ← set only when role = CLIENT, links to the Client they belong to
  createdAt, lastLoginAt

StaffMembership            ← many per User (only when role = STAFF)
  userId
  area: CRM | CUSTOMER_SUPPORT | DESIGN | AFFILIATION | MARKETING | PAYMENTS_FRAUD
  level: VIEWER | EDITOR | LEAD

Client
  id, companyName, slug
  primaryContactName, primaryContactEmail, primaryContactPhone
  servicesContracted: ServiceArea[]   ← any of the six areas above
  contractStart, contractEnd
  billingNotes (text)
  status: ACTIVE | PAUSED | CHURNED | PROSPECT
  createdAt, updatedAt

ClientContact              ← extra contacts beyond primary
  id, clientId, name, email, phone, role

ClientActivity             ← free-text activity log entries
  id, clientId, authorId, body, createdAt

Project
  id, name, slug
  status: NOT_STARTED | IN_PROGRESS | BLOCKED | DONE
  ownerId (User), clientId?, area: ServiceArea
  dueDate?, description (rich text)
  createdAt, updatedAt

ProjectNote
  id, projectId, authorId, body, createdAt

ProjectPageLink            ← link wiki pages to a project
  projectId, pageId

Space                      ← top of wiki hierarchy
  id, name, slug, description
  kind: INTERNAL | CLIENT      ← client spaces are auto-created per Client
  clientId?                    ← set when kind = CLIENT

Page                       ← hierarchical: a page can have a parentId
  id, spaceId, parentPageId?
  title, slug, contentJson (TipTap), contentText (for FTS)
  authorId, updatedById, createdAt, updatedAt
  visibility: AREA_RESTRICTED | ALL_STAFF | CLIENT_SHARED
  area?: ServiceArea         ← required when visibility = AREA_RESTRICTED

PageShare                  ← which clients can see this page (when CLIENT_SHARED)
  pageId, clientId

PageTag
  pageId, tag

Attachment
  id, ownerType (CLIENT | PROJECT | PAGE), ownerId
  url, filename, mimeType, sizeBytes, uploadedById, createdAt

ActivityLog                ← cross-cutting audit + recent-activity feed
  id, userId, action, entityType, entityId, payloadJson, createdAt
```

### Permissions matrix

| Role | Sees |
|---|---|
| **Admin** | Everything. Manages users, memberships, clients. |
| **Staff** | All clients (read), their projects, internal pages where (a) visibility = `ALL_STAFF`, or (b) `AREA_RESTRICTED` and the user has membership in that area. Edit/Lead = mutate; Viewer = read. |
| **Client** | Only their own Client record (read-only), their projects (read), pages where `PageShare` includes their client. No access to other clients or internal-only pages. |

Permission checks live in a single `can(user, action, entity)` helper used by every server action and query.

---

## 4. UI structure

```
/login                       — single login screen, role detected on submit

(Staff & Admin)
/                            — Dashboard: active clients, open projects, overdue, recent activity
/clients                     — list (table)
/clients/[slug]              — detail: contacts, services, contract, activity log, projects, pages
/projects                    — kanban + list/table toggle
/projects/[slug]             — detail: notes, linked pages, attachments
/wiki                        — space picker
/wiki/[space]/[...path]      — page view + edit
/search                      — global search
/admin/users                 — staff + memberships
/admin/clients/new           — onboard client (creates Client + Client space + Client user)

(Client login)
/                            — Client dashboard: their projects + status, shared pages, updates
/portal/projects/[slug]      — read-only project view
/portal/wiki/[...path]       — only pages shared with this client
```

**Layout:** persistent left sidebar (Spaces tree + top-level nav), main content, optional right rail (page metadata / linked items). Dense, keyboard-friendly: `Cmd-K` global search, `Cmd-N` new page, `/` quick nav.

---

## 5. Build phases

Each phase ends in a working, deployable app. Stop and review between phases.

1. **Scaffold + auth** — Next.js + Prisma + Postgres + Auth.js. Login, role-aware shell, empty dashboard, admin can create users.
2. **Clients (CRM-lite)** — clients list/detail, contacts, activity log, services. Visible on dashboard.
3. **Projects** — CRUD, kanban + table, notes, overdue logic. Link to clients.
4. **Wiki** — Spaces, pages, sub-pages, TipTap editor, tree nav, tags, search, internal links.
5. **Permissions + client portal** — enforce area/level checks, build the client-facing dashboard and shared-pages view, sharing UI.
6. **Polish** — dashboard widgets, JSON/Markdown export, keyboard shortcuts, attachments, email notifications, Vercel deploy.

Total estimate: ~5–7 focused build sessions to get to a usable v1.

---

## 6. Open questions for you

Before Phase 1, please confirm or push back on:

1. **Branding** — should I theme it with IGMS colors and put your logo in the sidebar header, or stay neutral for now?
2. **Magic link vs password** — do you want clients to log in with a magic link (no password to manage) or set their own password? My recommendation: magic link for clients, password for staff.
3. **Where will Postgres live?** — Neon (free tier, separate from Vercel) or Vercel Postgres (one bill, slightly pricier)? Either is fine.
4. **Domain** — will this live at something like `workspace.igamingmanagedservices.com`? Affects auth cookie + email setup.
5. **Migration** — do you want me to plan an importer for your existing Confluence content, or start fresh and copy over as you go?

Once you green-light the plan (and answer the five questions above), I'll start Phase 1.
