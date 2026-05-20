"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("resend", { email, redirect: false });
      if (res?.error) {
        setError("Could not send sign-in link. Try again or contact support.");
        return;
      }
      setSent(true);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-md bg-brand-bg p-1 text-xs font-medium">
        <button
          onClick={() => {
            setMode("password");
            setSent(false);
            setError(null);
          }}
          className={cn(
            "rounded px-3 py-1.5 transition-colors",
            mode === "password"
              ? "bg-brand-surface text-brand-fg"
              : "text-brand-muted hover:text-brand-fg",
          )}
        >
          Staff sign-in
        </button>
        <button
          onClick={() => {
            setMode("magic");
            setSent(false);
            setError(null);
          }}
          className={cn(
            "rounded px-3 py-1.5 transition-colors",
            mode === "magic"
              ? "bg-brand-surface text-brand-fg"
              : "text-brand-muted hover:text-brand-fg",
          )}
        >
          Client sign-in (email link)
        </button>
      </div>

      {sent ? (
        <div className="rounded-md border border-brand-border bg-brand-bg p-4 text-sm">
          Check your inbox — we sent a sign-in link to{" "}
          <span className="text-brand-fg font-medium">{email}</span>.
        </div>
      ) : mode === "password" ? (
        <form onSubmit={handlePassword} className="space-y-4">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoFocus
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-brand-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagic} className="space-y-4">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoFocus
            autoComplete="email"
          />
          {error && <p className="text-sm text-brand-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send sign-in link"}
          </button>
          <p className="text-xs text-brand-muted">
            We&apos;ll email you a one-time link. No password required.
          </p>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const { value, onChange, ...rest } = props;
  return (
    <label className="block">
      <span className="block text-xs text-brand-muted mb-1.5 uppercase tracking-wide">
        {label}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-fg placeholder:text-brand-muted focus:border-brand-accent focus:outline-none"
        required
      />
    </label>
  );
}
