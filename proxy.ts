import { NextResponse, type NextRequest } from "next/server";
import { securityPolicy, secureResponse } from "./worker/security";
import { canonicalUrl } from "./utils/site-origin";
import { publicSupabaseUrl } from "./utils/public-config";

export function proxy(request: NextRequest) {
  // Vinext already applies the tested Worker boundary. Avoid two CSP nonces.
  if (typeof __TVA_VINEXT__ !== "undefined" && __TVA_VINEXT__)
    return NextResponse.next();
  const canonical = canonicalUrl(request.url, process.env.PRIMARY_SITE_URL);
  if (canonical) return NextResponse.redirect(canonical, 308);
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))),
  );
  const csp = securityPolicy(
    nonce,
    publicSupabaseUrl || "https://invalid.supabase.co",
  );
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method))
    return secureResponse(
      new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD, OPTIONS" },
      }),
      request,
      csp,
    );
  if (["/_next/image", "/_vinext/image"].includes(request.nextUrl.pathname))
    return secureResponse(
      new Response("Not found", { status: 404 }),
      request,
      csp,
    );
  const headers = new Headers(request.headers);
  headers.set("content-security-policy", csp);
  headers.delete("x-nonce");
  headers.delete("content-security-policy-report-only");
  const response = NextResponse.next({ request: { headers } });
  // Next reads the nonce from the request CSP for framework scripts.
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  const secured = secureResponse(response, request, csp);
  secured.headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/webpack-hmr|assets/|favicon.svg).*)"],
};
