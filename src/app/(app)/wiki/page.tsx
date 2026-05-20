import { Topbar } from "@/components/topbar";

export default function WikiPlaceholder() {
  return (
    <>
      <Topbar title="Wiki" subtitle="Phase 4 — coming next" />
      <div className="p-6 text-brand-muted text-sm">
        The knowledge base ships in Phase 4 with TipTap editor, spaces tree, full-text search and
        per-area visibility.
      </div>
    </>
  );
}
