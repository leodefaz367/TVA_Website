"use client";
import { useState } from "react";
import { getSupabase } from "../../services/supabase";
import { useResource } from "../../hooks/useResource";
import { useAction } from "../../hooks/useAction";
import { saveCategory } from "../../services/admin";
import { listCategories } from "../../services/catalog";
import { AsyncState } from "../AsyncState";
import ActionFeedback from "./ActionFeedback";
import BankTransferEditor from "./BankTransferEditor";
async function loadSettings() {
  const { data, error } = await getSupabase().from("site_settings").select("*");
  if (error) throw error;
  return data as { key: string; value: string }[];
}
export default function SettingsPanel() {
  const settings = useResource(loadSettings);
  const categories = useResource(listCategories);
  const action = useAction();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  return (
    <section>
      <h2>Información y categorías</h2>
      <BankTransferEditor />
      <AsyncState
        loading={settings.loading}
        error={settings.error}
        retry={settings.reload}
      />
      {["schedule", "address"].map((key) => (
        <Setting
          key={key + (settings.data?.find((s) => s.key === key)?.value ?? "")}
          name={key}
          initial={settings.data?.find((s) => s.key === key)?.value ?? ""}
        />
      ))}
      <h3>Categorías</h3>
      <AsyncState
        loading={categories.loading}
        error={categories.error}
        retry={categories.reload}
      />
      <p>{categories.data?.map((c) => c.name).join(" · ")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await saveCategory(name, slug);
            setName("");
            setSlug("");
            categories.reload();
          });
        }}
      >
        <div className="form-grid">
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Slug
            <input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
        </div>
        <button className="button button-primary" disabled={action.busy}>
          Agregar categoría
        </button>
      </form>
      <ActionFeedback {...action} />
    </section>
  );
}
function Setting({ name, initial }: { name: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const action = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          const { error } = await getSupabase()
            .from("site_settings")
            .upsert({ key: name, value });
          if (error) throw error;
        });
      }}
    >
      <label>
        {name === "schedule" ? "Horarios" : "Dirección"}
        <textarea
          maxLength={5000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button disabled={action.busy}>Guardar</button>
      <ActionFeedback {...action} />
    </form>
  );
}
