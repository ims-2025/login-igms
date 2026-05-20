export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-brand-border bg-brand-surface px-6 py-3">
      <div>
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-brand-muted mt-0.5">{subtitle}</p>}
      </div>
    </header>
  );
}
