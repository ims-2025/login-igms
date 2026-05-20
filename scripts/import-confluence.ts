/* eslint-disable no-console */
/**
 * Confluence Cloud → IGMS Workspace importer.
 *
 * Run with:
 *   npm run import:confluence
 *
 * Requires these env vars (see .env.example):
 *   CONFLUENCE_BASE_URL    https://igamingmanagedservices.atlassian.net
 *   CONFLUENCE_EMAIL       your Atlassian login email
 *   CONFLUENCE_API_TOKEN   generated at id.atlassian.com → API tokens
 *
 * Optional:
 *   CONFLUENCE_SPACE_KEY   limit to one space (e.g. AFF) for a smoke test
 *   CONFLUENCE_DRY_RUN     "true" = list only, don't write anything
 */

import { PrismaClient, ServiceArea, SpaceKind, PageVisibility } from "@prisma/client";
import { slugify } from "../src/lib/utils";

const BASE = mustEnv("CONFLUENCE_BASE_URL");
const EMAIL = mustEnv("CONFLUENCE_EMAIL");
const TOKEN = mustEnv("CONFLUENCE_API_TOKEN");
const SPACE_FILTER = process.env.CONFLUENCE_SPACE_KEY?.trim() || null;
const DRY_RUN = (process.env.CONFLUENCE_DRY_RUN ?? "").toLowerCase() === "true";

const AUTH = "Basic " + Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");

const prisma = new PrismaClient();

function mustEnv(k: string): string {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing required env var ${k}. See .env.example.`);
    process.exit(1);
  }
  return v;
}

// Confluence space-key → our service-area enum. Adjust if your space keys differ.
const SPACE_KEY_TO_AREA: Record<string, ServiceArea> = {
  AFF: "AFFILIATION",
  CRM: "CRM",
  CS: "CUSTOMER_SUPPORT",
  CSUPPORT: "CUSTOMER_SUPPORT",
  DSGN: "DESIGN",
  DESIGN: "DESIGN",
  MKT: "MARKETING",
  MARKETING: "MARKETING",
  PNF: "PAYMENTS_FRAUD",
  PF: "PAYMENTS_FRAUD",
};

type ConfluenceSpace = {
  id: string;
  key: string;
  name: string;
  description?: { plain?: { value?: string } };
};

type ConfluencePage = {
  id: string;
  title: string;
  parentId: string | null;
  spaceId: string;
  status: string;
  body?: { view?: { value?: string } };
};

type Paged<T> = { results: T[]; _links?: { next?: string } };

async function call<T>(path: string): Promise<T> {
  let url: string;
  if (path.startsWith("http")) url = path;
  else if (path.startsWith("/wiki/")) url = `${BASE}${path}`;
  else url = `${BASE}/wiki${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Confluence API ${res.status} ${res.statusText} at ${url}\n${body.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

async function* paginate<T>(initialPath: string): AsyncGenerator<T> {
  let next: string | null = initialPath;
  while (next) {
    const data: Paged<T> = await call<Paged<T>>(next);
    for (const item of data.results) yield item;
    next = data._links?.next ?? null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let candidate = base || "page";
  let i = 2;
  while (taken.has(candidate)) candidate = `${base}-${i++}`;
  taken.add(candidate);
  return candidate;
}

async function importSpace(space: ConfluenceSpace) {
  const label = `[${space.key}] ${space.name}`;
  console.log(`\n${label}`);

  const area = SPACE_KEY_TO_AREA[space.key.toUpperCase()] ?? null;
  if (area) console.log(`  → mapped to service area: ${area}`);
  else console.log(`  → no service-area mapping for key "${space.key}" (will land in ALL_STAFF visibility)`);

  if (DRY_RUN) {
    let count = 0;
    for await (const _ of paginate<ConfluencePage>(`/api/v2/spaces/${space.id}/pages?limit=100`)) count++;
    console.log(`  (dry-run) ${count} pages would be imported`);
    return;
  }

  const ourSpace = await prisma.space.upsert({
    where: { slug: slugify(space.key) },
    update: { name: space.name, description: space.description?.plain?.value ?? null },
    create: {
      name: space.name,
      slug: slugify(space.key),
      description: space.description?.plain?.value ?? null,
      kind: SpaceKind.INTERNAL,
    },
  });

  // First pass: create / update every page (no parent links yet)
  const confluenceIdToOurId = new Map<string, string>();
  const pendingParents = new Map<string, string>(); // ourId → confluenceParentId
  const takenSlugs = new Set<string>();
  let n = 0;

  for await (const page of paginate<ConfluencePage>(
    `/api/v2/spaces/${space.id}/pages?body-format=view&limit=50`,
  )) {
    if (page.status !== "current") continue; // skip drafts / archived
    n++;
    const html = page.body?.view?.value ?? "";
    const text = stripHtml(html);
    const slug = uniqueSlug(slugify(page.title) || page.id, takenSlugs);

    const saved = await prisma.page.upsert({
      where: { spaceId_slug: { spaceId: ourSpace.id, slug } },
      update: {
        title: page.title,
        contentHtml: html,
        contentText: text,
        externalSource: `confluence:${page.id}`,
        visibility: area ? PageVisibility.AREA_RESTRICTED : PageVisibility.ALL_STAFF,
        area,
      },
      create: {
        spaceId: ourSpace.id,
        title: page.title,
        slug,
        contentHtml: html,
        contentText: text,
        externalSource: `confluence:${page.id}`,
        visibility: area ? PageVisibility.AREA_RESTRICTED : PageVisibility.ALL_STAFF,
        area,
      },
    });

    confluenceIdToOurId.set(page.id, saved.id);
    if (page.parentId) pendingParents.set(saved.id, page.parentId);
    if (n % 10 === 0) process.stdout.write(`  ${n} pages\r`);
  }

  // Second pass: wire up parent → child relationships
  let linked = 0;
  for (const [ourId, parentConfluenceId] of pendingParents) {
    const parentOurId = confluenceIdToOurId.get(parentConfluenceId);
    if (parentOurId && parentOurId !== ourId) {
      await prisma.page.update({ where: { id: ourId }, data: { parentPageId: parentOurId } });
      linked++;
    }
  }

  console.log(`  ✓ ${n} pages imported, ${linked} parent links restored`);
}

async function main() {
  console.log(`→ Confluence: ${BASE}`);
  console.log(`→ User:       ${EMAIL}`);
  console.log(`→ Filter:     ${SPACE_FILTER ? `space=${SPACE_FILTER}` : "all spaces"}`);
  console.log(`→ Mode:       ${DRY_RUN ? "DRY RUN" : "live import"}`);

  // Smoke-test the connection by hitting /spaces?limit=1
  try {
    await call<Paged<ConfluenceSpace>>("/api/v2/spaces?limit=1");
  } catch (e) {
    console.error("\nCould not reach Confluence. Check CONFLUENCE_BASE_URL, EMAIL, and API_TOKEN.");
    throw e;
  }
  console.log("✓ Authenticated\n");

  let spaceCount = 0;
  for await (const space of paginate<ConfluenceSpace>("/api/v2/spaces?limit=100")) {
    if (SPACE_FILTER && space.key !== SPACE_FILTER) continue;
    spaceCount++;
    await importSpace(space);
  }

  if (spaceCount === 0) {
    console.warn(`\nNo spaces matched ${SPACE_FILTER ? `key=${SPACE_FILTER}` : "your token"}.`);
  } else {
    console.log(`\n✓ Done. ${spaceCount} space(s) processed.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
