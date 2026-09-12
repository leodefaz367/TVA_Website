import { ValidationError } from "./validation-error";
export async function validateImageFile(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    !file.size ||
    file.size > 5242880
  )
    throw new ValidationError("Usa una imagen JPG, PNG o WebP de hasta 5 MB.");
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp =
    new TextDecoder().decode(b.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(b.slice(8, 12)) === "WEBP";
  if (
    !(file.type === "image/png" ? png : file.type === "image/jpeg" ? jpg : webp)
  )
    throw new ValidationError(
      "El contenido del archivo no coincide con el tipo de imagen.",
    );
}

export function safeImageSource(src: string, supabaseUrl?: string) {
  if (/^\/assets\/[a-zA-Z0-9_.-]+$/.test(src)) return src;
  if (!supabaseUrl) return "/assets/logo-tva.png";
  try {
    const url = new URL(src);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.origin === new URL(supabaseUrl).origin &&
      (url.pathname.startsWith("/storage/v1/object/public/product-images/") ||
        url.pathname.startsWith("/storage/v1/object/public/academy-images/"))
    )
      return url.href;
  } catch {
    /* An untrusted URL is replaced with a local image. */
  }
  return "/assets/logo-tva.png";
}
