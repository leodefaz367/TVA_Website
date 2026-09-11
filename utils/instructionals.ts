import { ValidationError } from "./validation-error";

export function trailerEmbed(value: string): string | null {
  if (!value.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ValidationError(
      "Introduce un enlace válido de YouTube para el tráiler.",
    );
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new ValidationError(
      "El tráiler debe usar un enlace HTTPS de YouTube.",
    );
  let id: string | null = null;
  if (url.hostname === "youtu.be") id = url.pathname.slice(1);
  if (
    ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
  ) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else
      id =
        url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})\/?$/)?.[1] ?? null;
  }
  if (!id || !/^[\w-]{11}$/.test(id))
    throw new ValidationError(
      "Usa un enlace de YouTube como https://www.youtube.com/watch?v=… o https://youtu.be/… y permite su inserción.",
    );
  return `https://www.youtube-nocookie.com/embed/${id}?hl=es`;
}

export function validateDriveUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ValidationError(
      "Introduce el enlace de una carpeta o archivo de Google Drive.",
    );
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "drive.google.com" ||
    url.username ||
    url.password ||
    url.port ||
    !/^\/(?:drive\/folders\/|file\/d\/)[\w-]+(?:\/view)?\/?$/.test(url.pathname)
  )
    throw new ValidationError(
      "Usa el enlace de una carpeta o archivo de drive.google.com.",
    );
  return url.href;
}

export function deliveryMessage(
  name: string,
  email: string,
  url: string,
  note: string,
) {
  return `Tu acceso a «${name}» está listo.\nAbre el contenido con la cuenta de Google ${email}:\n${url}\n${note}\nSi no puedes entrar, comprueba que estás usando esa cuenta y contáctanos.`;
}
