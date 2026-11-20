"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { Copy, Pencil, Send, X } from "lucide-react";
import { formatIST } from "@/lib/time";
import { getPushState } from "@/lib/pwa/client";
import { ui } from "@/lib/motion/presets";
import Preview from "./Preview";
import SignOut from "./SignOut";
import type { Draft, Notif, Overview } from "./types";

const CATS = ["announcement", "schedule", "arrival", "venue", "reminder", "urgent"];
type Tab = "overview" | "compose" | "queue" | "history";

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

const blank = (): Draft => ({ title: "", body: "", url: "/", image: "", category: "announcement", mode: "now", date: "", time: "", key: crypto.randomUUID() });

function Stat({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <div className="border-t border-white/15 py-4">
      <p className="label">{label}</p>
      <p className="display text-5xl">{value}</p>
      <p className="mt-1 text-xs text-dim">{note}</p>
    </div>
  );
}

function Row({ n, actions }: { n: Notif; actions?: React.ReactNode }) {
  return (
    <li className="grid gap-2 border-t border-white/15 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${n.status}`}>{n.status.replace("_", " ")}</span>
        <span className="label">{n.category}</span>
        <span className="text-xs text-dim">{n.status === "pending" || n.status === "processing" ? `Scheduled ${formatIST(n.scheduled_for)} IST` : `Created ${formatIST(n.created_at)} IST`}</span>
      </div>
      <p className="font-bold">{n.title}</p>
      <p className="text-sm text-dim">{n.body}</p>
      {n.status !== "pending" && n.status !== "cancelled" && (
        <p className="text-xs text-dim">
          {n.target_count} targeted · <b className="text-bone">{n.accepted_count}</b> accepted by push service · {n.failed_count} failed · {n.expired_count} expired removed · {n.attempt_count} attempt(s)
          {n.last_error && n.status !== "sent" ? ` · ${n.last_error}` : ""}
        </p>
      )}
      {n.status === "pending" && n.attempt_count > 0 && <p className="text-xs text-volt">Retrying after a temporary failure: next attempt {formatIST(n.next_attempt_at ?? n.scheduled_for)} IST</p>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}

export default function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [ov, setOv] = useState<Overview | null>(null);
  const [upcoming, setUpcoming] = useState<Notif[]>([]);
  const [history, setHistory] = useState<Notif[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([api<Overview>("/api/organizer/overview"), api<{ notifications: Notif[] }>("/api/organizer/notifications?scope=upcoming"), api<{ notifications: Notif[] }>("/api/organizer/notifications")]);
    if (a.ok) setOv(a.data);
    if (b.ok) setUpcoming(b.data.notifications);
    if (c.ok) setHistory(c.data.notifications.filter((n) => !["pending", "processing"].includes(n.status)));
    if (a.status === 401) location.reload();
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 20_000); return () => clearInterval(id); }, [load]);

  const editing = !!draft.id;
  const todayIST = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()), []);
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const valid = draft.title.trim() && draft.body.trim() && (draft.mode === "now" || (draft.date && draft.time));

  async function submit() {
    setBusy(true); setFlash(null); setConfirm(false);
    const payload = { title: draft.title, body: draft.body, url: draft.url, image: draft.image, category: draft.category, mode: draft.mode, date: draft.date, time: draft.time, idempotencyKey: draft.key };
    const r = editing
      ? await api<{ notification: Notif }>(`/api/organizer/notifications/${draft.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api<{ notification: Notif; duplicate?: boolean }>("/api/organizer/notifications", { method: "POST", body: JSON.stringify(payload) });
    setBusy(false);
    if (!r.ok) return setFlash({ kind: "err", text: r.data.error ?? "Request failed" });
    const n = r.data.notification;
    const dup = "duplicate" in r.data && r.data.duplicate;
    setFlash({
      kind: n.status === "failed" ? "err" : "ok",
      text: dup ? "Already submitted: duplicate click ignored, nothing was sent twice."
        : editing ? "Scheduled notification updated."
        : n.status === "pending" ? `Scheduled for ${formatIST(n.scheduled_for)} IST.`
        : `Dispatch ${n.status.replace("_", " ")}: ${n.accepted_count} of ${n.target_count} accepted by the push service, ${n.failed_count} failed, ${n.expired_count} expired removed.`,
    });
    setDraft(blank()); load(); setTab(n.status === "pending" ? "queue" : "history");
  }

  async function cancel(id: string) {
    const r = await api<object>(`/api/organizer/notifications/${id}/cancel`, { method: "POST" });
    setFlash(r.ok ? { kind: "ok", text: "Cancelled." } : { kind: "err", text: r.data.error ?? "Failed" });
    load();
  }
  const duplicate = (n: Notif) => { setDraft({ ...blank(), title: n.title, body: n.body, url: n.url ?? "/", image: n.image_url ?? "", category: n.category }); setTab("compose"); };
  const edit = (n: Notif) => {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(n.scheduled_for));
    const t = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(n.scheduled_for));
    setDraft({ id: n.id, title: n.title, body: n.body, url: n.url ?? "", image: n.image_url ?? "", category: n.category, mode: "schedule", date: d, time: t, key: n.id }); setTab("compose");
  };
  async function testDevice() {
    const s = await getPushState();
    if (s.kind !== "on") return setFlash({ kind: "err", text: "This device isn't subscribed. Open the public site on it, tap Enable notifications, then try again." });
    const r = await api<{ ok: boolean }>("/api/organizer/test", { method: "POST", body: JSON.stringify({ endpoint: s.endpoint }) });
    setFlash(r.ok ? { kind: "ok", text: "Test accepted by the push service. Check this device." } : { kind: "err", text: r.data.error ?? "Test failed" });
  }

  return (
    <LazyMotion features={domAnimation}>
      <main className="wrap py-8 md:py-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="label">Organizer</p><h1 className="display text-4xl md:text-6xl">11 Years of Impact</h1></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-dim sm:inline">{email}</span><SignOut /></div>
        </header>

        <div role="tablist" className="mb-8 flex gap-1 overflow-x-auto border-b border-white/15">
          {(["overview", "compose", "queue", "history"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`min-h-12 whitespace-nowrap border-b-2 px-4 text-sm font-extrabold uppercase tracking-wider ${tab === t ? "border-flare text-bone" : "border-transparent text-dim"}`}>
              {t === "queue" ? `Scheduled${upcoming.length ? ` (${upcoming.length})` : ""}` : t}
            </button>
          ))}
        </div>

        <AnimatePresence>{flash && (
          <m.p key="f" role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={ui.fade}
            className={`mb-6 rounded-xl border p-4 text-sm font-semibold ${flash.kind === "ok" ? "border-[#7ee2a8] text-[#7ee2a8]" : "border-flare text-flare"}`}>{flash.text}</m.p>
        )}</AnimatePresence>

        {tab === "overview" && (ov ? (
          <div className="grid gap-10">
            <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Active subscriptions" value={ov.subscriptions.active} note={`${ov.subscriptions.expired} expired · ${ov.subscriptions.unsubscribed} unsubscribed`} />
              <Stat label="Notifications sent" value={ov.notifications.sent + ov.notifications.partiallyFailed} note={`${ov.notifications.failed} failed outright`} />
              <Stat label="Upcoming scheduled" value={ov.notifications.pending} note="Pending, will send server-side" />
              <Stat label="Failed deliveries" value={ov.deliveries.failed} note="Per-device failures after retries" />
            </div>
            <div className="grid gap-x-8 sm:grid-cols-3">
              <Stat label="Delivery attempts" value={ov.deliveries.attempted} note="Device-level sends tried (all time)" />
              <Stat label="Accepted by push service" value={ov.deliveries.acceptedByPushService} note="Not proof the device displayed it" />
              <Stat label="Reported opens" value={ov.deliveries.reportedOpens} note="Best-effort taps reported by the app; undercounts" />
            </div>
            <div className="grid gap-10 lg:grid-cols-3">
              <section><h2 className="label mb-2">Recent notifications</h2><ul>{ov.recent.length ? ov.recent.map((n) => <Row key={n.id} n={n} />) : <li className="py-4 text-dim">None yet.</li>}</ul></section>
              <section><h2 className="label mb-2">Next scheduled</h2><ul>{ov.upcoming.length ? ov.upcoming.map((n) => <Row key={n.id} n={n} />) : <li className="py-4 text-dim">Nothing scheduled.</li>}</ul></section>
              <section><h2 className="label mb-2">Activity log</h2><ul className="text-sm">{ov.activity.map((a) => <li key={a.id} className="border-t border-white/15 py-3"><b>{a.action}</b> <span className="text-dim">by {a.actor_email} · {formatIST(a.created_at)}</span></li>)}</ul></section>
            </div>
          </div>
        ) : <p className="text-dim">Loading…</p>)}

        {tab === "compose" && (
          <div className="grid gap-10 lg:grid-cols-2">
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); draft.mode === "now" ? setConfirm(true) : submit(); }}>
              <h2 className="display text-3xl">{editing ? "Edit scheduled notification" : "New notification"}</h2>
              <label className="grid gap-1 text-sm font-bold">Title <span className="font-normal text-dim">{draft.title.length}/65</span>
                <input className="field" maxLength={65} required value={draft.title} onChange={(e) => set({ title: e.target.value })} /></label>
              <label className="grid gap-1 text-sm font-bold">Message <span className="font-normal text-dim">{draft.body.length}/178</span>
                <textarea className="field" maxLength={178} required value={draft.body} onChange={(e) => set({ body: e.target.value })} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold">Category
                  <select className="field" value={draft.category} onChange={(e) => set({ category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label className="grid gap-1 text-sm font-bold">Deep link (path on this site)
                  <input className="field" placeholder="/#schedule" value={draft.url} onChange={(e) => set({ url: e.target.value })} /></label>
              </div>
              <label className="grid gap-1 text-sm font-bold">Image URL (https, optional)
                <input className="field" type="url" placeholder="https://…" value={draft.image} onChange={(e) => set({ image: e.target.value })} /></label>

              {!editing && (
                <fieldset className="grid gap-3"><legend className="label mb-1">When</legend>
                  <div className="flex gap-2">
                    {(["now", "schedule"] as const).map((md) => (
                      <button type="button" key={md} onClick={() => set({ mode: md })} aria-pressed={draft.mode === md} className={`btn ${draft.mode === md ? "btn-primary" : "btn-ghost"}`}>{md === "now" ? "Send now" : "Schedule"}</button>
                    ))}
                  </div>
                </fieldset>
              )}
              {(draft.mode === "schedule" || editing) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-bold">Date (IST)<input className="field" type="date" min={todayIST} required value={draft.date} onChange={(e) => set({ date: e.target.value })} /></label>
                  <label className="grid gap-1 text-sm font-bold">Time (IST)<input className="field" type="time" required value={draft.time} onChange={(e) => set({ time: e.target.value })} /></label>
                  <p className="text-xs text-dim sm:col-span-2">Times are Asia/Kolkata. Sent at or shortly after this time (scheduler runs about once a minute), never before.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button className="btn btn-primary" disabled={!valid || busy}><Send size={18} aria-hidden />{editing ? "Save changes" : draft.mode === "now" ? "Send now" : "Schedule"}</button>
                {editing && <button type="button" className="btn btn-ghost" onClick={() => setDraft(blank())}>Cancel edit</button>}
                <button type="button" className="btn btn-ghost" onClick={testDevice}>Send test to this device</button>
              </div>
            </form>
            <div className="grid content-start gap-4">
              <h2 className="label">Preview</h2>
              <Preview title={draft.title} body={draft.body} image={draft.image} />
              <p className="text-xs text-dim">Approximate. Actual appearance depends on the OS, browser and the user&apos;s notification settings.</p>
            </div>
          </div>
        )}

        {tab === "queue" && (
          <ul>{upcoming.length ? upcoming.map((n) => (
            <Row key={n.id} n={n} actions={n.status === "pending" && <>
              <button className="btn btn-ghost !min-h-10 !px-4 !text-sm" onClick={() => edit(n)}><Pencil size={14} aria-hidden /> Edit</button>
              <button className="btn btn-ghost !min-h-10 !px-4 !text-sm" onClick={() => cancel(n.id)}><X size={14} aria-hidden /> Cancel</button>
            </>} />
          )) : <li className="py-8 text-dim">No scheduled notifications.</li>}</ul>
        )}

        {tab === "history" && (
          <ul>{history.length ? history.map((n) => (
            <Row key={n.id} n={n} actions={<button className="btn btn-ghost !min-h-10 !px-4 !text-sm" onClick={() => duplicate(n)}><Copy size={14} aria-hidden /> Duplicate</button>} />
          )) : <li className="py-8 text-dim">No history yet.</li>}</ul>
        )}

        <AnimatePresence>{confirm && (
          <>
            <m.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(false)} />
            <m.div role="dialog" aria-modal="true" aria-label="Confirm send" className="sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={ui.sheet}>
              <h2 className="display text-3xl">Send to {ov ? ov.subscriptions.active : "all"} subscribers now?</h2>
              <p className="mt-2 text-sm text-dim">This can&apos;t be recalled once the push service accepts it. {draft.category === "urgent" ? "Urgent notices go to everyone, regardless of category preferences." : ""}</p>
              <div className="my-5"><Preview title={draft.title} body={draft.body} image={draft.image} /></div>
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-primary" onClick={submit} disabled={busy} autoFocus><Send size={18} aria-hidden /> Yes, send now</button>
                <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Go back</button>
              </div>
            </m.div>
          </>
        )}</AnimatePresence>
      </main>
    </LazyMotion>
  );
}
