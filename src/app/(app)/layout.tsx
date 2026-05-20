import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/sidebar";
import { NextAuthProvider } from "@/components/session-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "CLIENT") redirect("/portal");

  return (
    <NextAuthProvider>
      <div className="flex h-screen">
        <Sidebar
          role={session.user.role}
          userName={session.user.name ?? null}
          userEmail={session.user.email}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </NextAuthProvider>
  );
}
