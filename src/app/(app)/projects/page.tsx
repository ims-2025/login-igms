import { Topbar } from "@/components/topbar";

export default function ProjectsPlaceholder() {
  return (
    <>
      <Topbar title="Projects" subtitle="Phase 3 — coming next" />
      <div className="p-6 text-brand-muted text-sm">
        The Projects module ships in Phase 3 with kanban + table views, owner/due-date filters and
        wiki-page linking.
      </div>
    </>
  );
}
