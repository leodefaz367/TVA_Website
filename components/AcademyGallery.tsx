"use client";
import { useRef, useState } from "react";
import { useResource } from "../hooks/useResource";
import {
  listAcademyPhotos,
  originalAcademyPhoto,
  type AcademyPhoto,
} from "../services/academy";
import SiteImage from "./SiteImage";
export function AcademyCarousel({ photos }: { photos: AcademyPhoto[] }) {
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  if (!photos.length) return null;
  const current = index % photos.length;
  const move = (step: number) =>
    setIndex((value) => (value + step + photos.length) % photos.length);
  return (
    <section
      className="academy-gallery"
      aria-label="Fotos de la academia"
      aria-roledescription="carrusel"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div
        className="academy-photo"
        onTouchStart={(event) => {
          const point = event.touches[0];
          touch.current = { x: point.clientX, y: point.clientY };
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const point = event.changedTouches[0];
          const dx = start.x - point.clientX,
            dy = start.y - point.clientY;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
            move(dx > 0 ? 1 : -1);
        }}
      >
        <SiteImage src={photos[current].url} alt={photos[current].alt} />
        <span>DISCIPLINA · TÉCNICA · COMUNIDAD</span>
      </div>
      {photos.length > 1 && (
        <div className="academy-gallery-controls">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Foto anterior"
          >
            ←
          </button>
          <p aria-live="polite" aria-atomic="true">
            Foto {current + 1} de {photos.length}
          </p>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Foto siguiente"
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}
export default function AcademyGallery() {
  const photos = useResource(listAcademyPhotos);
  return (
    <div className="academy-gallery-container">
      <AcademyCarousel photos={photos.data ?? [originalAcademyPhoto]} />
      {photos.error && (
        <p role="status">
          No se pudieron cargar las fotos adicionales.{" "}
          <button onClick={photos.reload}>Reintentar</button>
        </p>
      )}
    </div>
  );
}
