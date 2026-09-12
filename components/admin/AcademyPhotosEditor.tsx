"use client";
import { useRef, useState } from "react";
import { useResource } from "../../hooks/useResource";
import { useAction } from "../../hooks/useAction";
import { addAcademyPhoto, listAcademyPhotos } from "../../services/academy";
import { ValidationError } from "../../utils/validation-error";
import { AsyncState } from "../AsyncState";
import SiteImage from "../SiteImage";
import ActionFeedback from "./ActionFeedback";
export default function AcademyPhotosEditor() {
  const photos = useResource(listAcademyPhotos);
  const action = useAction();
  const [files, setFiles] = useState<File[]>([]);
  const [alt, setAlt] = useState("");
  const [progress, setProgress] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="academy-photo-editor">
      <h3>Fotos de la academia</h3>
      <p>
        Agrega fotos a la galería de «La academia». La foto original y las que
        ya subiste se conservan.
      </p>
      <AsyncState
        loading={photos.loading}
        error={photos.error}
        retry={photos.reload}
      />
      <div className="academy-photo-list">
        {photos.data?.map((photo) => (
          <figure key={photo.id}>
            <SiteImage
              src={photo.url}
              alt={photo.alt}
              width={240}
              height={160}
            />
            <figcaption>
              {photo.id === "original" ? "Foto original" : photo.alt}
            </figcaption>
          </figure>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async () => {
            if (!files.length)
              throw new ValidationError("Selecciona al menos una foto.");
            const pending = [...files];
            let completed = 0;
            try {
              for (const file of pending) {
                setProgress(
                  `Subiendo foto ${completed + 1} de ${pending.length}…`,
                );
                await addAcademyPhoto(file, alt);
                completed++;
                setFiles(pending.slice(completed));
              }
              setAlt("");
              if (input.current) input.current.value = "";
            } finally {
              setProgress(completed ? `${completed} foto(s) agregada(s).` : "");
              photos.reload();
            }
          }, "Fotos agregadas a la galería.");
        }}
      >
        <label>
          Agregar fotos (JPG, PNG o WebP; máximo 5 MB por foto)
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={action.busy}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>
        {!!files.length && (
          <p>
            {files.length} foto(s) pendiente(s):{" "}
            {files.map((file) => file.name).join(", ")}
          </p>
        )}
        <label>
          Descripción de las fotos (opcional)
          <input
            value={alt}
            maxLength={250}
            disabled={action.busy}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="Por ejemplo: clase de jiu jitsu en equipo"
          />
        </label>
        <button
          className="button button-primary"
          disabled={action.busy || !files.length}
        >
          {action.busy ? "Subiendo…" : "Agregar a la galería"}
        </button>
        <p role="status">{progress}</p>
        <ActionFeedback {...action} />
      </form>
    </section>
  );
}
