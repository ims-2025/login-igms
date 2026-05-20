"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  BookOpen,
  Search,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const STAFF_NAV: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: KanbanSquare },
  { href: "/wiki", label: "Wiki", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
];

const CLIENT_NAV: Item[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/wiki", label: "Shared docs", icon: BookOpen },
];

export function Sidebar({
  role,
  userName,
  userEmail,
}: {
  role: "ADMIN" | "STAFF" | "CLIENT";
  userName: string | null;
  userEmail: string;
}) {
  const pathname = usePathname();
  const items = role === "CLIENT" ? CLIENT_NAV : STAFF_NAV;
  const showAdmin = role === "ADMIN";

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-brand-border bg-brand-surface">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-brand-border">
        <div className="h-7 w-7 rounded-md bg-brand-accent text-brand-accent-fg grid place-items-center font-bold text-sm">
          I
        </div>
        <span className="font-semibold tracking-tight">IGMS Workspace</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-brand-bg text-brand-fg"
                  : "text-brand-muted hover:bg-brand-bg hover:text-brand-fg",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {showAdmin && (
          <>
            <div className="mt-4 mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
              Admin
            </div>
            <Link
              href="/admin/users"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-brand-bg text-brand-fg"
                  : "text-brand-muted hover:bg-brand-bg hover:text-brand-fg",
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-brand-border p-3">
        <div className="mb-2 px-1">
          <div className="truncate text-sm font-medium">{userName ?? userEmail}</div>
          <div className="truncate text-xs text-brand-muted">{userEmail}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-brand-muted hover:bg-brand-bg hover:text-brand-fg"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
