/** Image health check: does the URL still serve an image? */

export interface HealthResult {
  ok: boolean;
  status?: number;
  reason?: string;
}

export async function checkImageUrl(url: string, fetchImpl: typeof fetch = fetch, timeoutMs = 10_000): Promise<HealthResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res = await fetchImpl(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    // Some CDNs reject HEAD; retry with a tiny ranged GET.
    if (res.status === 405 || res.status === 403) {
      res = await fetchImpl(url, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "follow", signal: ctrl.signal });
    }
    if (!res.ok) return { ok: false, status: res.status, reason: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return { ok: false, status: res.status, reason: `Not an image (${type || "no content-type"})` };
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Run async tasks with a concurrency limit (be polite to image hosts). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}
