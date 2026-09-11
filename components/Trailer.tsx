"use client";
import { trailerEmbed } from "../utils/instructionals";
export default function Trailer({ url }: { url: string }) {
  let src: string | null;
  try {
    src = trailerEmbed(url);
  } catch {
    return (
      <p role="alert">
        El enlace del tráiler no es compatible. Contacta con la academia.
      </p>
    );
  }
  if (!src) return null;
  return (
    <div className="course-trailer">
      <h3>Tráiler del instruccional</h3>
      <iframe
        src={src}
        title="Tráiler del instruccional"
        loading="lazy"
        allow="encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <a href={url} target="_blank" rel="noopener noreferrer">
        Ver tráiler en YouTube
      </a>
    </div>
  );
}
