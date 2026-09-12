import "dotenv/config";
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
function requireOrigin(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label}: falta un origen HTTPS válido.`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error(
      `${label}: usa solamente un origen HTTPS, sin ruta ni credenciales.`,
    );
}
requireOrigin(url, "Supabase URL");
let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key || "");
if (!publicKey) {
  try {
    const parts = key.split(".");
    publicKey =
      parts.length === 3 &&
      JSON.parse(Buffer.from(parts[1], "base64url")).role === "anon";
  } catch {
    /* Not a legacy anonymous JWT. */
  }
}
if (!publicKey)
  throw new Error(
    "Configura únicamente la clave publicable o anon de Supabase; las claves privadas no pueden compilarse en el navegador.",
  );
for (const [name, value] of Object.entries(process.env)) {
  if (
    /^(VITE_|NEXT_PUBLIC_)/.test(name) &&
    /SECRET|SERVICE_ROLE|PASSWORD|PRIVATE|DATABASE_URL/i.test(name) &&
    value
  )
    throw new Error(`Variable pública no permitida: ${name}`);
}
for (const suffix of ["URL", "PUBLISHABLE_KEY"]) {
  const vite = process.env[`VITE_SUPABASE_${suffix}`],
    next = process.env[`NEXT_PUBLIC_SUPABASE_${suffix}`];
  if (vite && next && vite !== next)
    throw new Error(
      `Las variables públicas de Supabase ${suffix} deben coincidir entre entornos de compilación.`,
    );
}
if (process.env.PRIMARY_SITE_URL)
  requireOrigin(process.env.PRIMARY_SITE_URL, "PRIMARY_SITE_URL");
console.log(
  "Configuración de compilación: origen HTTPS y clave pública verificados, sin mostrar valores.",
);
