import { Topbar } from "@/components/topbar";

export default function ClientsPlaceholder() {
  return (
    <>
      <Topbar title="Clients" subtitle="Phase 2 — coming next" />
      <div className="p-6 text-brand-muted text-sm">
        The Clients module ships in Phase 2. It will include a sortable table, detail pages with
        contacts and activity log, and per-client wiki spaces.
      </div>
    </>
  );
}
