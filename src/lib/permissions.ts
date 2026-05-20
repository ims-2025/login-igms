/**
 * Single source of truth for "can this user do X to Y?"
 *
 * Every server action and data query routes its access decision through this
 * file. Keep the logic centralized so we never accidentally rely on UI checks
 * for security.
 */
import {
  PageVisibility,
  ProjectStatus,
  Role,
  ServiceArea,
  StaffLevel,
} from "@prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  clientId: string | null;
  memberships: { area: ServiceArea; level: StaffLevel }[];
};

export const isAdmin = (u: SessionUser) => u.role === "ADMIN";
export const isStaff = (u: SessionUser) => u.role === "STAFF" || u.role === "ADMIN";
export const isClient = (u: SessionUser) => u.role === "CLIENT";

export function hasArea(u: SessionUser, area: ServiceArea): boolean {
  if (isAdmin(u)) return true;
  return u.memberships.some((m) => m.area === area);
}

export function canEditArea(u: SessionUser, area: ServiceArea): boolean {
  if (isAdmin(u)) return true;
  return u.memberships.some(
    (m) => m.area === area && (m.level === "EDITOR" || m.level === "LEAD"),
  );
}

export function canLeadArea(u: SessionUser, area: ServiceArea): boolean {
  if (isAdmin(u)) return true;
  return u.memberships.some((m) => m.area === area && m.level === "LEAD");
}

// ─── Clients ───────────────────────────────────────────────────────────

export function canReadClient(u: SessionUser, clientId: string): boolean {
  if (isStaff(u)) return true; // all staff can read all clients
  return u.clientId === clientId; // client users see only their own record
}

export function canWriteClient(u: SessionUser, _clientId: string): boolean {
  return isAdmin(u);
}

// ─── Projects ──────────────────────────────────────────────────────────

export function canReadProject(
  u: SessionUser,
  project: { area: ServiceArea; clientId: string | null },
): boolean {
  if (isAdmin(u)) return true;
  if (isStaff(u)) return hasArea(u, project.area);
  if (isClient(u)) return !!project.clientId && project.clientId === u.clientId;
  return false;
}

export function canWriteProject(
  u: SessionUser,
  project: { area: ServiceArea },
): boolean {
  if (isAdmin(u)) return true;
  if (isStaff(u)) return canEditArea(u, project.area);
  return false;
}

// ─── Pages ─────────────────────────────────────────────────────────────

export function canReadPage(
  u: SessionUser,
  page: {
    visibility: PageVisibility;
    area: ServiceArea | null;
    shares: { clientId: string }[];
  },
): boolean {
  if (isAdmin(u)) return true;

  if (isStaff(u)) {
    if (page.visibility === "ALL_STAFF") return true;
    if (page.visibility === "AREA_RESTRICTED" && page.area) {
      return hasArea(u, page.area);
    }
    if (page.visibility === "CLIENT_SHARED") return true; // staff can always see client-shared pages
    return false;
  }

  if (isClient(u)) {
    if (page.visibility !== "CLIENT_SHARED") return false;
    if (!u.clientId) return false;
    return page.shares.some((s) => s.clientId === u.clientId);
  }

  return false;
}

export function canWritePage(
  u: SessionUser,
  page: { visibility: PageVisibility; area: ServiceArea | null },
): boolean {
  if (isAdmin(u)) return true;
  if (!isStaff(u)) return false;
  if (page.visibility === "AREA_RESTRICTED" && page.area) {
    return canEditArea(u, page.area);
  }
  // ALL_STAFF + CLIENT_SHARED → any editor/lead in any area can write
  return u.memberships.some((m) => m.level !== "VIEWER");
}

// ─── Status helpers (used in dashboard) ────────────────────────────────

export const OPEN_PROJECT_STATUSES: ProjectStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
];
