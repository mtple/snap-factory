/**
 * Returns the public base URL for this snap factory deployment.
 *
 * Priority:
 *   1. SNAP_PUBLIC_BASE_URL env var (set on Vercel)
 *   2. Constructed from request headers (x-forwarded-host, x-forwarded-proto)
 *   3. Falls back to localhost for dev
 *
 * Snaps should use this to build absolute target URLs for submit actions,
 * navigation, and anywhere else the client needs to POST back to us.
 */
export function snapBaseUrlFromRequest(request: Request): string {
  const fromEnv = process.env.SNAP_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const host = (forwardedHost ?? hostHeader)?.split(",")[0].trim();

  const isLoopback =
    host !== undefined &&
    /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/.test(host);

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto
    ? forwardedProto.split(",")[0].trim().toLowerCase()
    : isLoopback
      ? "http"
      : "https";

  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  return `http://localhost:${process.env.PORT ?? "3003"}`.replace(/\/$/, "");
}

/**
 * Returns the canonical clean URL for a given snap by name.
 * Example: snapUrl(request, "rock-paper-scissors")
 *   → "https://snap-factory.vercel.app/snaps/rock-paper-scissors"
 *
 * Always use this (rather than hardcoding paths) so URLs work in dev,
 * preview, and production without code changes.
 */
export function snapUrl(request: Request, name: string): string {
  return `${snapBaseUrlFromRequest(request)}/snaps/${name}`;
}
