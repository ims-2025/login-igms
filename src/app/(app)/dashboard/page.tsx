import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { formatDate, relativeTime } from "@/lib/utils";
import { OPEN_PROJECT_STATUSES } from "@/lib/permissions";
import { SERVICE_AREA_LABEL } from "@/lib/services";

export default async function StaffDashboard() {
  const session = await auth();
  // Layout guarantees session exists.
  const user = session!.user;

  const [activeClients, openProjects, overdueProjects, recentActivity] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.project.count({ where: { status: { in: OPEN_PROJECT_STATUSES } } }),
    prisma.project.findMany({
      where: {
        status: { in: OPEN_PROJECT_STATUSES },
        dueDate: { lt: new Date() },
      },
      include: { client: true, owner: true },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.activityLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <>
      <Topbar
        title={`Welcome back, ${user.name?.split(" ")[0] ?? "team"}`}
        subtitle="Overview of clients, projects and recent activity"
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Active clients" value={activeClients} href="/clients" />
          <StatCard label="Open projects" value={openProjects} href="/projects" />
          <StatCard
            label="Overdue"
            value={overdueProjects.length}
            tone={overdueProjects.length > 0 ? "danger" : "default"}
            href="/projects?filter=overdue"
          />
        </div>

        <Panel title="Overdue projects" href="/projects?filter=overdue">
          {overdueProjects.length === 0 ? (
            <Empty>Nothing overdue. Nice.</Empty>
          ) : (
            <ul className="divide-y divide-brand-border">
              {overdueProjects.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 px-1 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="font-medium text-brand-fg hover:underline truncate"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-brand-muted truncate">
                      {p.client?.companyName ?? "Internal"} · {SERVICE_AREA_LABEL[p.area]}
                      {p.owner?.name ? ` · ${p.owner.name}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-brand-danger whitespace-nowrap pl-3">
                    Due {formatDate(p.dueDate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity">
          {recentActivity.length === 0 ? (
            <Empty>No activity yet. Add a client or create a project to get started.</Empty>
          ) : (
            <ul className="divide-y divide-brand-border">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-start justify-between py-2 px-1 text-sm">
                  <div>
                    <span className="text-brand-fg">{a.user?.name ?? "system"}</span>{" "}
                    <span className="text-brand-muted">
                      {a.action.toLowerCase().replace(/_/g, " ")} a {a.entityType.toLowerCase()}
                    </span>
                  </div>
                  <div className="text-xs text-brand-muted whitespace-nowrap pl-3">
                    {relativeTime(a.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "default" | "danger";
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-brand-border bg-brand-surface p-4 hover:border-brand-accent transition-colors block"
    >
      <div className="text-xs uppercase tracking-wide text-brand-muted">{label}</div>
      <div
        className={
          "mt-2 text-3xl font-semibold " +
          (tone === "danger" ? "text-brand-danger" : "text-brand-fg")
        }
      >
        {value}
      </div>
    </Link>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-brand-border bg-brand-surface">
      <div className="flex items-center justify-between border-b border-brand-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="text-xs text-brand-muted hover:text-brand-fg">
            View all →
          </Link>
        )}
      </div>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-brand-muted px-1 py-6 text-center">{children}</div>;
}
