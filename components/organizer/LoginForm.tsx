"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginForm() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr(null);
    const f = new FormData(e.currentTarget);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    if (error) { setErr("Sign-in failed. Check your email and password."); setBusy(false); return; }
    location.reload(); // server re-verifies the organizer role on the next render
  }
  return (
    <main className="grid min-h-svh place-items-center px-6">
      <form onSubmit={submit} className="grid w-full max-w-sm gap-4">
        <p className="display text-6xl text-flare" aria-hidden>11</p>
        <h1 className="display text-4xl">Organizer</h1>
        <label className="grid gap-1 text-sm font-bold">Email
          <input name="email" type="email" required autoComplete="username" className="field" />
        </label>
        <label className="grid gap-1 text-sm font-bold">Password
          <input name="password" type="password" required autoComplete="current-password" className="field" />
        </label>
        {err && <p role="alert" className="text-sm text-flare">{err}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
