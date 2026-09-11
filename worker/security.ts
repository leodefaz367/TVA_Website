export function securityPolicy(nonce: string, supabaseUrl: string) {
  const origin = new URL(supabaseUrl).origin;
  if (!origin.startsWith("https://"))
    throw new Error("Invalid Supabase origin");
  return [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    // React image styles need attributes; scripts never allow unsafe-inline/eval.
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' ${origin}/storage/v1/object/public/product-images/ data:`,
    "font-src 'self'",
    `connect-src 'self' ${origin}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "frame-src https://www.youtube-nocookie.com",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}
export function secureResponse(
  response: Response,
  request: Request,
  csp: string,
) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  headers.set("X-Frame-Options", "DENY");
  headers.delete("X-Powered-By");
  if (new URL(request.url).protocol === "https:")
    headers.set("Strict-Transport-Security", "max-age=31536000");
  if (headers.get("content-type")?.includes("text/html")) {
    headers.set("Content-Security-Policy", csp);
    headers.set("Cache-Control", "private, no-store");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
