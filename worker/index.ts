import handler from "vinext/server/app-router-entry";
import { secureResponse, securityPolicy } from "./security";
const worker = {
  async fetch(
    request: Request,
    env: { ASSETS: Fetcher },
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !local) {
      url.protocol = "https:";
      return Response.redirect(url.href, 308);
    }
    const nonce = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))),
    );
    const csp = securityPolicy(
      nonce,
      import.meta.env.VITE_SUPABASE_URL || "https://invalid.supabase.co",
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
