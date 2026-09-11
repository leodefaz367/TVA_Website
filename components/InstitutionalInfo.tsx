"use client";
import { getSupabase } from "../services/supabase";
import { useResource } from "../hooks/useResource";
import { AsyncState } from "./AsyncState";
async function load() {
  const { data, error } = await getSupabase()
    .from("site_settings")
    .select("key,value")
    .in("key", ["schedule", "address"]);
  if (error) throw error;
  return data as { key: string; value: string }[];
}
export default function InstitutionalInfo() {
  const { data, error, loading, reload } = useResource(load);
  return (
    <section className="institutional-info section">
      <h2 className="compact-title">Visítanos</h2>
      <AsyncState
        loading={loading}
        error={
          error
            ? "No pudimos consultar horarios y dirección. Escríbenos por WhatsApp para confirmarlos."
            : ""
        }
        retry={reload}
      />
      {data?.map((s) => (
        <div key={s.key}>
          <h3>{s.key === "schedule" ? "Horarios" : "Dirección"}</h3>
          <p className="preserve-lines">
            {s.value || "Por confirmar con la academia."}
          </p>
        </div>
      ))}
      {!loading && !error && !data?.length && (
        <p>Consulta nuestros horarios y ubicación por WhatsApp.</p>
      )}
    </section>
  );
}
