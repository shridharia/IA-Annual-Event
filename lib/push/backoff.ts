export const MAX_ATTEMPTS = 4;

/** Exponential backoff with a floor: 1m, 4m, 16m. Returns the delay in ms after failed attempt N (1-based). */
export function backoffMs(attempt: number): number {
  return 60_000 * 4 ** Math.max(0, attempt - 1);
}

export type Outcome = { accepted: number; failedRetryable: number; failedPermanent: number; expired: number };

/**
 * Decide the notification's state after an attempt.
 * - nothing retryable left → sent (all accepted), partially_failed (some accepted), failed (none accepted)
 * - retryable failures and attempts remain → back to pending with backoff
 */
export function resolveStatus(o: Outcome, attempt: number, totalAcceptedSoFar: number) {
  if (o.failedRetryable > 0 && attempt < MAX_ATTEMPTS) return { status: "pending" as const, retryInMs: backoffMs(attempt) };
  const bad = o.failedRetryable + o.failedPermanent;
  if (bad === 0) return { status: "sent" as const, retryInMs: 0 };
  return { status: totalAcceptedSoFar > 0 ? ("partially_failed" as const) : ("failed" as const), retryInMs: 0 };
}

/** HTTP statuses from a push service that mean "this subscription is gone". */
export const isGone = (status?: number) => status === 404 || status === 410;
/** Statuses worth retrying (rate limit / server trouble / network). 400/401/403/413 are permanent. */
export const isRetryable = (status?: number) => status === undefined || status === 429 || status >= 500;
