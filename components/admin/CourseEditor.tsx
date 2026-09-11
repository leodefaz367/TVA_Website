"use client";
import { useState, type FormEvent } from "react";
import type {
  Product,
  CourseModule,
  InstructionalMedia,
} from "../../types/commerce";
import {
  saveCourse,
  saveModule,
  saveMedia,
  listMedia,
  removeContent,
} from "../../services/admin";
import { useAction } from "../../hooks/useAction";
import { useResource } from "../../hooks/useResource";
import { integer, required } from "../../utils/commerce";
import ActionFeedback from "./ActionFeedback";
import { AsyncState } from "../AsyncState";
import Trailer from "../Trailer";
import DriveEditor from "./DriveEditor";
export default function CourseEditor({
  product: p,
  reload,
}: {
  product: Product;
  reload: () => void;
}) {
  const [trainer, setTrainer] = useState(
    p.instructional_courses?.trainer ?? "Michael Vivas",
  );
  const [level, setLevel] = useState(
    p.instructional_courses?.level ?? "Todos los niveles",
  );
  const [note, setNote] = useState(
    p.instructional_courses?.delivery_note ??
      "Acceso enviado manualmente después de confirmar el pago.",
  );
  const action = useAction();
  const [trailer, setTrailer] = useState(
    p.instructional_courses?.trailer_url ?? "",
  );
  const [module, setModule] = useState<Partial<CourseModule>>({
    title: "",
    description: "",
    position: 0,
  });
  const [media, setMedia] = useState<Partial<InstructionalMedia>>({
    module_id: "",
    title: "",
    resource: "",
  });
  const resources = useResource(listMedia);
  function courseSubmit(e: FormEvent) {
    e.preventDefault();
    void action.run(async () => {
      await saveCourse({
        product_id: p.id,
        trainer: trainer.trim(),
        level: level.trim(),
        trailer_url: trailer.trim(),
        delivery_note: required(note, "Entrega", 2000),
      });
      reload();
    });
  }
  return (
    <section className="admin-section">
      <h3>Presentación del instruccional</h3>
      <form onSubmit={courseSubmit}>
        <fieldset disabled={action.busy}>
          <div className="form-grid">
            <label>
              Entrenador
              <input
                maxLength={180}
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
              />
            </label>
            <label>
              Nivel
              <input
                maxLength={100}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </label>
          </div>
          <label>
            Indicaciones públicas de entrega
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label>
            Enlace del tráiler (opcional)
            <input
              type="url"
              maxLength={2000}
              value={trailer}
              onChange={(e) => setTrailer(e.target.value)}
            />
          </label>
          <p>
            Usa un enlace HTTPS de YouTube con reproducción en otros sitios
            permitida. El tráiler será público; nunca pegues aquí el enlace del
            contenido pagado.
          </p>
          {trailer && <Trailer url={trailer} />}
          <button className="button button-primary">
            Guardar presentación y tráiler
          </button>
        </fieldset>
      </form>
      <ActionFeedback {...action} />
      <DriveEditor productId={p.id} />
      {!p.instructional_courses && (
        <p className="notice">
          El temario es opcional. Guarda la presentación para habilitar la
          creación de módulos. El precio y el enlace de Drive se guardan por
          separado.
        </p>
      )}
      {p.instructional_courses && (
        <>
          <h4>Temario opcional</h4>
          <p>
            No necesitas módulos para publicar. El número de orden determina su
            posición en el temario público.
          </p>
          {[...p.instructional_modules]
            .sort((a, b) => a.position - b.position)
            .map((m) => (
              <div className="section-toolbar" key={m.id}>
                <span>
                  {m.position}. {m.title}
                </span>
                <div>
                  <button onClick={() => setModule(m)}>Editar</button>
                  <button
                    disabled={action.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Eliminar este módulo y sus referencias de contenido?",
                        )
                      )
                        void action.run(async () => {
                          await removeContent("instructional_modules", m.id);
                          reload();
                          resources.reload();
                        });
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                await saveModule(
                  {
                    product_id: p.id,
                    title: required(module.title ?? "", "Título"),
                    description: module.description ?? "",
                    position: integer(module.position, 0, 10000, "Orden"),
                  },
                  module.id,
                );
                setModule({ title: "", description: "", position: 0 });
                reload();
              });
            }}
          >
            <fieldset disabled={action.busy}>
              <legend>{module.id ? "Editar módulo" : "Nuevo módulo"}</legend>
              <div className="form-grid">
                <label>
                  Título
                  <input
                    value={module.title ?? ""}
                    onChange={(e) =>
                      setModule({ ...module, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Orden
                  <input
                    type="number"
                    value={module.position ?? 0}
                    onChange={(e) =>
                      setModule({ ...module, position: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label>
                Descripción
                <textarea
                  maxLength={3000}
                  value={module.description ?? ""}
                  onChange={(e) =>
                    setModule({ ...module, description: e.target.value })
                  }
                />
              </label>
              <button className="button button-primary">Guardar módulo</button>
              {module.id && (
                <button
                  type="button"
                  onClick={() =>
                    setModule({ title: "", description: "", position: 0 })
                  }
                >
                  Cancelar edición
                </button>
              )}
            </fieldset>
          </form>
          <details>
            <summary>Referencias anteriores por módulo</summary>
            <h4>Referencias privadas por módulo</h4>
            <p>
              Registra una ruta de almacenamiento privado o una referencia del
              proveedor de video. Estas referencias solo las ve el
              administrador; la entrega es manual.
            </p>
            <AsyncState
              loading={resources.loading}
              error={resources.error}
              retry={resources.reload}
            />
            {resources.data
              ?.filter((r) =>
                p.instructional_modules.some((m) => m.id === r.module_id),
              )
              .map((r) => (
                <div className="section-toolbar" key={r.id}>
                  <span>{r.title}</span>
                  <div>
                    <button onClick={() => setMedia(r)}>Editar</button>
                    <button
                      disabled={action.busy}
                      onClick={() => {
                        if (window.confirm("¿Eliminar esta referencia?"))
                          void action.run(async () => {
                            await removeContent("instructional_media", r.id);
                            resources.reload();
                          });
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action.run(async () => {
                  await saveMedia(
                    {
                      module_id: required(media.module_id ?? "", "Módulo"),
                      title: required(media.title ?? "", "Título"),
                      resource: required(media.resource ?? "", "Recurso", 2000),
                    },
                    media.id,
                  );
                  setMedia({ module_id: "", title: "", resource: "" });
                  resources.reload();
                });
              }}
            >
              <fieldset disabled={action.busy}>
                <legend>{media.id ? "Editar recurso" : "Nuevo recurso"}</legend>
                <label>
                  Módulo
                  <select
                    value={media.module_id ?? ""}
                    onChange={(e) =>
                      setMedia({ ...media, module_id: e.target.value })
                    }
                  >
                    <option value="">Seleccionar</option>
                    {p.instructional_modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Título
                  <input
                    value={media.title ?? ""}
                    onChange={(e) =>
                      setMedia({ ...media, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Referencia privada
                  <input
                    maxLength={2000}
                    value={media.resource ?? ""}
                    onChange={(e) =>
                      setMedia({ ...media, resource: e.target.value })
                    }
                  />
                </label>
                <button className="button button-primary">
                  Guardar recurso
                </button>
                {media.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setMedia({ module_id: "", title: "", resource: "" })
                    }
                  >
                    Cancelar edición
                  </button>
                )}
              </fieldset>
            </form>
          </details>
        </>
      )}
      <ActionFeedback {...action} />
    </section>
  );
}
