import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { formatDate } from "@/lib/utils";
import { OPEN_PROJECT_STATUSES } from "@/lib/permissions";
import { SERVICE_AREA_LABEL } from "@/lib/services";

export default async function ClientDashboard() {
  const session = await auth();
  const user = session!.user;
  if (!user.clientId) {
    return (
      <>
        <Topbar title="Welcome" />
        <div className="p-6 text-sm text-brand-muted">
          Your account is not linked to a client yet. Please contact your IGMS administrator.
        </div>
      </>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: user.clientId },
    include: {
      projects: {
        where: { status: { in: OPEN_PROJECT_STATUSES } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  const sharedPages = await prisma.page.findMany({
    where: {
      visibility: "CLIENT_SHARED",
      shares: { some: { clientId: user.clientId } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: { space: true },
  });

  return (
    <>
      <Topbar
        title={client ? client.companyName : "Your workspace"}
        subtitle="Active projects and shared documents"
      />

      <div className="p-6 space-y-6">
        <section className="rounded-lg border border-brand-border bg-brand-surface">
          <div className="border-b border-brand-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Open projects</h2>
          </div>
          <div className="px-3 py-2">
            {!client?.projects.length ? (
              <div className="text-sm text-brand-muted px-1 py-6 text-center">
                No active projects right now.
              </div>
            ) : (
              <ul className="divide-y divide-brand-border">
                {client.projects.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2 px-1 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-brand-fg truncate">{p.name}</div>
                      <div className="text-xs text-brand-muted truncate">
                        {SERVICE_AREA_LABEL[p.area]} · {p.status.toLowerCase().replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="text-xs text-brand-muted whitespace-nowrap pl-3">
                      {p.dueDate ? `Due ${formatDate(p.dueDate)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-brand-border bg-brand-surface">
          <div className="border-b border-brand-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Shared documents</h2>
          </div>
          <div className="px-3 py-2">
            {sharedPages.length === 0 ? (
              <div className="text-sm text-brand-muted px-1 py-6 text-center">
                Nothing shared with you yet.
              </div>
            ) : (
              <ul className="divide-y divide-brand-border">
                {sharedPages.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2 px-1 text-sm"
                  >
                    <Link
                      href={`/portal/wiki/${p.space.slug}/${p.slug}`}
                      className="font-medium text-brand-fg hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-brand-muted">{p.space.name}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
