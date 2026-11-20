import { describe, expect, it } from "vitest";
import { istToDate, remaining, formatClock, longDate } from "@/lib/time";
import { isSafeDeepLink, isHttpsUrl, notificationInput, subscriptionInput } from "@/lib/validate";
import { backoffMs, resolveStatus, MAX_ATTEMPTS, isGone, isRetryable } from "@/lib/push/backoff";

describe("timezone (Asia/Kolkata)", () => {
  it("converts IST wall-clock to the correct UTC instant", () => {
    expect(istToDate("2026-12-17", "18:30")!.toISOString()).toBe("2026-12-17T13:00:00.000Z");
    expect(istToDate("2026-12-17")!.toISOString()).toBe("2026-12-16T18:30:00.000Z");
  });
  it("rejects malformed input", () => {
    expect(istToDate("17-12-2026")).toBeNull();
    expect(istToDate("2026-12-17", "25:00")).toBeNull();
    expect(istToDate("2026-13-45")).toBeNull();
  });
  it("renders the date in IST regardless of runtime zone", () => {
    expect(longDate("2026-12-17")).toMatch(/^Thursday,? 17 December 2026$/);
    expect(formatClock("18:05")).toBe("6:05 PM");
    expect(formatClock("00:00")).toBe("12:00 AM");
  });
  it("countdown math and completed state", () => {
    const t = new Date("2026-12-17T00:00:00+05:30");
    const r = remaining(t, t.getTime() - (2 * 864e5 + 3 * 36e5 + 4 * 6e4 + 5e3));
    expect(r).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
    expect(remaining(t, t.getTime() + 1).done).toBe(true);
  });
});

describe("validation", () => {
  it("allows only same-site deep links", () => {
    for (const ok of ["/", "/#schedule", "/offline?x=1"]) expect(isSafeDeepLink(ok)).toBe(true);
    for (const bad of ["//evil.com", "https://evil.com", "javascript:alert(1)", "/\\evil.com", "evil", "/a b"]) expect(isSafeDeepLink(bad)).toBe(false);
  });
  it("requires https images", () => {
    expect(isHttpsUrl("https://x.com/a.png")).toBe(true);
    expect(isHttpsUrl("http://x.com/a.png")).toBe(false);
    expect(isHttpsUrl("data:image/png;base64,AAA")).toBe(false);
  });
  const base = { title: "Hi", body: "Body", category: "announcement", mode: "now", idempotencyKey: crypto.randomUUID() };
  it("accepts a valid notification and empty optionals", () => {
    expect(notificationInput.safeParse({ ...base, url: "", image: "" }).success).toBe(true);
  });
  it("rejects bad category, long title, bad link", () => {
    expect(notificationInput.safeParse({ ...base, category: "spam" }).success).toBe(false);
    expect(notificationInput.safeParse({ ...base, title: "x".repeat(66) }).success).toBe(false);
    expect(notificationInput.safeParse({ ...base, url: "https://evil.com" }).success).toBe(false);
  });
  it("requires https push endpoints", () => {
    const keys = { p256dh: "x".repeat(30), auth: "y".repeat(12) };
    expect(subscriptionInput.safeParse({ endpoint: "https://fcm.googleapis.com/x", keys }).success).toBe(true);
    expect(subscriptionInput.safeParse({ endpoint: "http://internal/x", keys }).success).toBe(false);
  });
});

describe("retry & status resolution", () => {
  it("backs off exponentially", () => {
    expect([1, 2, 3].map(backoffMs)).toEqual([60_000, 240_000, 960_000]);
  });
  it("classifies push-service statuses", () => {
    expect(isGone(410)).toBe(true); expect(isGone(404)).toBe(true); expect(isGone(400)).toBe(false);
    expect(isRetryable(429)).toBe(true); expect(isRetryable(503)).toBe(true); expect(isRetryable(undefined)).toBe(true);
    expect(isRetryable(401)).toBe(false); expect(isRetryable(413)).toBe(false);
  });
  it("sent / partial / failed / retry", () => {
    expect(resolveStatus({ accepted: 5, failedRetryable: 0, failedPermanent: 0, expired: 1 }, 1, 5).status).toBe("sent");
    expect(resolveStatus({ accepted: 5, failedRetryable: 2, failedPermanent: 0, expired: 0 }, 1, 5).status).toBe("pending");
    expect(resolveStatus({ accepted: 5, failedRetryable: 2, failedPermanent: 0, expired: 0 }, MAX_ATTEMPTS, 5).status).toBe("partially_failed");
    expect(resolveStatus({ accepted: 0, failedRetryable: 2, failedPermanent: 0, expired: 0 }, MAX_ATTEMPTS, 0).status).toBe("failed");
    expect(resolveStatus({ accepted: 0, failedRetryable: 0, failedPermanent: 0, expired: 0 }, 1, 0).status).toBe("sent");
  });
});
