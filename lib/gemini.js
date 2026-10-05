// Calls Gemini with bounded retries for transient failures (429/5xx, timeouts, network errors).
// Non-transient errors (400, 401, 403, 404) fail immediately so a bad key or model name is not hidden.

export const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callGeminiWithRetry({
  url,
  init,
  fetchImpl = fetch,
  sleep = defaultSleep,
  maxAttempts = 3,
  attemptTimeoutMs = 15000,
  totalBudgetMs = 25000,
  baseDelayMs = 800,
  now = Date.now,
}) {
  const started = now();
  let lastError;
  let attemptsMade = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remaining = totalBudgetMs - (now() - started);
    if (remaining < 3000) break; // not enough time left for a useful attempt

    attemptsMade = attempt;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(attemptTimeoutMs, remaining));
    try {
      const response = await fetchImpl(url, { ...init, signal: controller.signal });
      if (response.ok) return { response, attempts: attempt };
      lastError = new Error(`Gemini request failed (${response.status}).`);
      lastError.status = response.status;
      if (!RETRYABLE_STATUS.has(response.status)) throw lastError;
    } catch (error) {
      if (error.status && !RETRYABLE_STATUS.has(error.status)) throw error;
      lastError = error.name === "AbortError" ? new Error("Gemini request timed out.") : error;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < maxAttempts) {
      // Exponential backoff with jitter: ~0.8s, ~1.6s
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      if (totalBudgetMs - (now() - started) - delay < 3000) break;
      await sleep(delay);
    }
  }

  const error = new Error(
    `Gemini is temporarily busy; tried ${attemptsMade} time${attemptsMade === 1 ? "" : "s"}. ${lastError?.message || ""}`.trim(),
  );
  error.status = 503;
  throw error;
}
