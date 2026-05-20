import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "CLIENT" ? "/portal" : "/dashboard");
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-brand-fg">
            <div className="h-8 w-8 rounded-md bg-brand-accent text-brand-accent-fg grid place-items-center font-bold">
              I
            </div>
            <span className="text-lg font-semibold tracking-tight">IGMS Workspace</span>
          </div>
          <p className="mt-2 text-brand-muted text-sm">
            iGaming Managed Services — internal & client portal
          </p>
        </div>

        <div className="rounded-lg border bg-brand-surface p-6 shadow-lg">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-brand-muted">
          Trouble signing in? Contact your IGMS administrator.
        </p>
      </div>
    </main>
  );
}
