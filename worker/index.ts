import handler from "vinext/server/app-router-entry";
import { secureResponse, securityPolicy } from "./security";
import { canonicalUrl } from "../utils/site-origin";
import { publicSupabaseUrl } from "../utils/public-config";
const worker = {
  async fetch(
    request: Request,
    env: { ASSETS: Fetcher; PRIMARY_SITE_URL?: string },
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const canonical = canonicalUrl(request.url, env.PRIMARY_SITE_URL);
    if (canonical) return Response.redirect(canonical, 308);
    const nonce = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))),
    );
    const csp = securityPolicy(
      nonce,
      publicSupabaseUrl || "https://invalid.supabase.co",
    );
    const respond = (response: Response) =>
      secureResponse(response, request, csp);
    // Mutations currently use Supabase bearer tokens. There are no server actions.
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method))
      return respond(
        new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD, OPTIONS" },
        }),
      );
    // Images are served unoptimized; this unused parser/proxy must not accept input.
    if (["/_vinext/image", "/_next/image"].includes(url.pathname))
      return respond(new Response("Not found", { status: 404 }));
    const headers = new Headers(request.headers);
    headers.set("content-security-policy", csp);
    headers.delete("content-security-policy-report-only");
    headers.delete("x-nonce");
    try {
      return respond(
        await handler.fetch(new Request(request, { headers }), env, ctx),
      );
    } catch {
      console.error(
        JSON.stringify({ event: "request_failed", id: crypto.randomUUID() }),
      );
      return respond(
        new Response("No se pudo completar la solicitud.", { status: 500 }),
      );
    }
  },
};
export default worker;
