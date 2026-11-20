"use client";
/** Browser-side PWA + Web Push helpers. Nothing here runs at import time (SSR-safe). */

export type Platform = {
  ios: boolean; android: boolean; safari: boolean; firefox: boolean; chromium: boolean; desktop: boolean;
  standalone: boolean;
};

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const firefox = /Firefox|FxiOS/.test(ua);
  const chromium = /Chrome|CriOS|Edg|EdgiOS|OPR/.test(ua) && !firefox;
  const safari = /Safari/.test(ua) && !chromium && !firefox;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return { ios, android, safari, firefox, chromium, desktop: !ios && !android, standalone };
}

// ───── service worker + updates ─────
export async function registerServiceWorker(onUpdate: (reg: ServiceWorkerRegistration) => void) {
  if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    if (reg.waiting && navigator.serviceWorker.controller) onUpdate(reg);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) onUpdate(reg);
      });
    });
    // Check for a new version when the app comes back to the foreground.
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
  } catch { /* SW unsupported or blocked: site still works */ }
}

export function applyUpdate(reg: ServiceWorkerRegistration) {
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
  reg.waiting?.postMessage({ type: "SKIP_WAITING" });
}

// ───── install prompt (Chromium only; iOS has none) ─────
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
export const onInstallChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const canPromptInstall = () => deferred !== null;

export function listenForInstall() {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as BIPEvent; listeners.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; markInstalled(); listeners.forEach((f) => f()); });
}
export async function promptInstall() {
  if (!deferred) return "unavailable" as const;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; listeners.forEach((f) => f());
  if (outcome === "dismissed") dismissInstallBanner();
  return outcome;
}

const DISMISS_KEY = "impact11:install-dismissed", INSTALLED_KEY = "impact11:installed";
const DAY = 864e5;
function safeGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
export const dismissInstallBanner = () => safeSet(DISMISS_KEY, String(Date.now()));
export const markInstalled = () => safeSet(INSTALLED_KEY, "1");
/** The auto banner stays quiet for 30 days after a dismissal and forever once installed. */
export const installBannerAllowed = () => !safeGet(INSTALLED_KEY) && Date.now() - Number(safeGet(DISMISS_KEY) ?? 0) > 30 * DAY;

// ───── Web Push ─────
export type PushState =
  | { kind: "loading" }
  | { kind: "unsupported"; reason: string }
  | { kind: "needs-install" }          // iOS Safari tab: push only works from the Home Screen app
  | { kind: "blocked" }                // permission denied
  | { kind: "off" }                    // can subscribe
  | { kind: "on"; endpoint: string };

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function getPushState(): Promise<PushState> {
  const p = detectPlatform();
  if (!pushSupported()) {
    // iOS only exposes PushManager to installed web apps (16.4+), so "unsupported" in an iOS tab means "install first".
    return p.ios && !p.standalone ? { kind: "needs-install" } : { kind: "unsupported", reason: "This browser doesn't support web push." };
  }
  if (p.ios && !p.standalone) return { kind: "needs-install" };
  if (Notification.permission === "denied") return { kind: "blocked" };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") return { kind: "on", endpoint: sub.endpoint };
  } catch { /* fall through */ }
  return { kind: "off" };
}

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** MUST be called from a user gesture (button click). */
export async function enablePush(): Promise<{ ok: true; endpoint: string } | { ok: false; error: string }> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { ok: false, error: "Notifications aren't configured yet (missing VAPID public key)." };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: perm === "denied" ? "Notifications are blocked for this site in your browser settings." : "Permission wasn't granted." };
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) as BufferSource });
    const res = await post("/api/push/subscribe", sub.toJSON());
    if (!res.ok) { await sub.unsubscribe().catch(() => {}); return { ok: false, error: "Couldn't save your subscription. Please try again." }; }
    return { ok: true, endpoint: sub.endpoint };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Something went wrong enabling notifications." };
  }
}

export async function disablePush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return true;
    const json = sub.toJSON();
    await post("/api/push/unsubscribe", { endpoint: sub.endpoint, auth: json.keys?.auth });
    await sub.unsubscribe();
    return true;
  } catch { return false; }
}

/** Quietly re-register an existing subscription so the server record is refreshed/repaired. No permission prompt involved. */
export async function resyncPush() {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await post("/api/push/subscribe", sub.toJSON());
  } catch { /* best effort */ }
}
