"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { BellRing, Check, Plus, Share, Smartphone } from "lucide-react";
import { ui } from "@/lib/motion/presets";
import {
  canPromptInstall, detectPlatform, disablePush, enablePush, getPushState, onInstallChange, promptInstall,
  type Platform, type PushState,
} from "@/lib/pwa/client";

function installSteps(p: Platform): { title: string; steps: React.ReactNode[] } {
  if (p.ios) {
    return {
      title: p.safari ? "On iPhone / iPad (Safari)" : "On iPhone / iPad",
      steps: [
        <>Tap the <Share size={15} className="inline -translate-y-px" aria-label="Share" /> <b>Share</b> button{p.safari ? " in the toolbar" : " in your browser"}.</>,
        <>Scroll and choose <b>Add to Home Screen</b> <Plus size={15} className="inline -translate-y-px" aria-hidden />, then tap <b>Add</b>.</>,
        <>Open <b>11 Years of Impact</b> from your Home Screen, come back to this section and enable notifications.</>,
      ],
    };
  }
  if (p.android) {
    return { title: "On Android", steps: [
      <>Tap <b>Install app</b> above if shown. Otherwise open your browser menu <b>⋮</b>.</>,
      <>Choose <b>Install app</b> or <b>Add to Home screen</b>.</>,
    ] };
  }
  if (p.safari) {
    return { title: "On Mac (Safari 17+)", steps: [<>Choose <b>File ▸ Add to Dock…</b> in the menu bar.</>] };
  }
  if (p.firefox) {
    return { title: "Firefox on desktop", steps: [<>Firefox desktop can&apos;t install web apps, but notifications still work in the browser. Bookmark this page to find it again.</>] };
  }
  return { title: "On desktop (Chrome / Edge)", steps: [<>Click <b>Install</b> above, or the install icon at the right of the address bar.</>] };
}

function StepHead({ n, title, done }: { n: string; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-sm font-extrabold ${done ? "border-flare bg-flare text-ink" : "border-white/25"}`}>
        {done ? <Check size={18} aria-label="Done" /> : n}
      </span>
      <h3 className="display text-3xl md:text-4xl">{title}</h3>
    </div>
  );
}

export default function StayUpdated() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [push, setPush] = useState<PushState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [, force] = useState(0);

  const refresh = useCallback(async () => setPush(await getPushState()), []);
  useEffect(() => {
    setPlatform(detectPlatform());
    refresh();
    return onInstallChange(() => force((n) => n + 1));
  }, [refresh]);

  const onEnable = async () => { // explicit user gesture only; never on page load
    setBusy(true); setMsg(null);
    const r = await enablePush();
    if (!r.ok) setMsg(r.error);
    await refresh(); setBusy(false);
  };
  const onDisable = async () => {
    setBusy(true); setMsg(null);
    const ok = await disablePush();
    setMsg(ok ? "You've unsubscribed. You won't receive event updates." : "Couldn't unsubscribe. Try again or reset the permission in browser settings.");
    await refresh(); setBusy(false);
  };

  const installed = !!platform?.standalone;
  const how = platform ? installSteps(platform) : null;

  return (
    <LazyMotion features={domAnimation}>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        {/* 1 — Home screen */}
        <div className="grid content-start gap-5">
          <StepHead n="1" title="Add to Home Screen" done={installed} />
          <p className="text-dim">Opens like an app, works offline, and is required for notifications on iPhone.</p>
          {installed ? (
            <p className="font-bold text-flare" role="status">Installed. You&apos;re using the app.</p>
          ) : (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-3">
                {canPromptInstall() && (
                  <button className="btn btn-primary" onClick={() => promptInstall()}><Smartphone size={18} aria-hidden /> Install app</button>
                )}
                <button className="btn btn-ghost" aria-expanded={showHow} onClick={() => setShowHow((s) => !s)}>{showHow ? "Hide steps" : "Show me how"}</button>
              </div>
              <AnimatePresence initial={false}>
                {showHow && how && (
                  <m.div key="how" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={ui.step} className="overflow-hidden">
                    <div className="mt-2 rounded-xl border border-white/15 p-5">
                      <p className="label mb-3">{how.title}</p>
                      <ol className="grid list-decimal gap-3 pl-5 marker:text-flare">{how.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* 2 — Notifications */}
        <div className="grid content-start gap-5">
          <StepHead n="2" title="Get event updates" done={push.kind === "on"} />
          <p className="text-dim">Announcements, schedule changes, arrival info and urgent notices. Only what matters, never spam. Unsubscribe any time.</p>

          <AnimatePresence mode="wait" initial={false}>
            <m.div key={push.kind} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={ui.fade} aria-live="polite">
              {push.kind === "loading" && <p className="text-dim">Checking this device…</p>}
              {push.kind === "needs-install" && (
                <p className="rounded-xl border border-white/15 p-5">On iPhone and iPad, notifications only work from the Home Screen app (iOS 16.4+). Complete step 1, open the app, then return here.</p>
              )}
              {push.kind === "unsupported" && <p className="rounded-xl border border-white/15 p-5">{push.reason} You can still bookmark this page and use the schedule above.</p>}
              {push.kind === "blocked" && (
                <p className="rounded-xl border border-flare/50 p-5">Notifications are <b>blocked</b> for this site. To enable them, allow notifications in your browser or system site settings, then reload this page.</p>
              )}
              {push.kind === "off" && (
                <div className="grid gap-3">
                  <p className="text-sm text-dim">Status: <b className="text-bone">Off</b>. Your browser will ask for permission when you tap the button.</p>
                  <button className="btn btn-primary justify-self-start" onClick={onEnable} disabled={busy}><BellRing size={18} aria-hidden /> {busy ? "Enabling…" : "Enable notifications"}</button>
                </div>
              )}
              {push.kind === "on" && (
                <div className="grid gap-3">
                  <p className="text-sm text-dim">Status: <b className="text-flare">On</b>. This device will receive event updates.</p>
                  <button className="btn btn-ghost justify-self-start" onClick={onDisable} disabled={busy}>{busy ? "Working…" : "Unsubscribe this device"}</button>
                </div>
              )}
            </m.div>
          </AnimatePresence>
          {msg && <p role="status" className="text-sm text-volt">{msg}</p>}
        </div>
      </div>
    </LazyMotion>
  );
}
