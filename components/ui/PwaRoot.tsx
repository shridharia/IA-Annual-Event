"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { Download, RefreshCw, X } from "lucide-react";
import { ui } from "@/lib/motion/presets";
import {
  applyUpdate, canPromptInstall, detectPlatform, dismissInstallBanner, installBannerAllowed,
  listenForInstall, onInstallChange, promptInstall, registerServiceWorker, resyncPush,
} from "@/lib/pwa/client";

/** Mounts once: service worker, update toast, and a single quiet install banner (Chromium only, dismissal remembered). */
export default function PwaRoot() {
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);
  const [banner, setBanner] = useState(false);

  useEffect(() => {
    listenForInstall();
    registerServiceWorker(setUpdate).then(resyncPush);
    let timer: ReturnType<typeof setTimeout>;
    const consider = () => {
      clearTimeout(timer);
      if (canPromptInstall() && !detectPlatform().standalone && installBannerAllowed()) {
        timer = setTimeout(() => setBanner(true), 20_000); // after the visitor has had time to enjoy the page
      }
    };
    const off = onInstallChange(() => { consider(); if (!canPromptInstall()) setBanner(false); });
    return () => { off(); clearTimeout(timer); };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {update && (
          <m.div key="upd" role="status" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={ui.step}
            className="fixed left-1/2 z-[70] flex w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-ink-2 py-2 pl-5 pr-2 shadow-2xl"
            style={{ top: "max(.75rem, env(safe-area-inset-top))" }}>
            <RefreshCw size={16} className="shrink-0 text-flare" aria-hidden />
            <span className="flex-1 text-sm font-semibold">A new version is ready.</span>
            <button className="btn btn-primary !min-h-10 !px-4 !text-sm" onClick={() => applyUpdate(update)}>Refresh</button>
          </m.div>
        )}
        {banner && !update && (
          <m.div key="ins" role="dialog" aria-label="Install app" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={ui.sheet}
            className="fixed left-1/2 z-[60] flex w-[min(30rem,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/15 bg-ink-2 p-3 pl-4 shadow-2xl"
            style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
            <Download size={18} className="shrink-0 text-flare" aria-hidden />
            <p className="flex-1 text-sm leading-snug"><strong>Keep it handy.</strong> Install the app for offline details and live updates.</p>
            <button className="btn btn-primary !min-h-10 !px-4 !text-sm" onClick={async () => { await promptInstall(); setBanner(false); }}>Install</button>
            <button aria-label="Dismiss" className="grid h-10 w-10 place-items-center rounded-full text-dim hover:text-bone" onClick={() => { dismissInstallBanner(); setBanner(false); }}><X size={18} /></button>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
