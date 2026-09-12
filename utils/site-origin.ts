export function primaryOrigin(value?: string): string | null {
  if (!value) return null;
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "PRIMARY_SITE_URL must be an HTTPS origin without path or credentials",
    );
  return url.origin;
}
export function canonicalUrl(
  requestUrl: string,
  configured?: string,
): string | null {
  const url = new URL(requestUrl);
  const primary = primaryOrigin(configured);
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return null;
  if (primary && url.origin !== primary)
    return primary + url.pathname + url.search;
  if (url.protocol !== "https:") {
    url.protocol = "https:";
    return url.href;
  }
  return null;
}
