import { getSupabase } from "./supabase";
import { validateImageFile } from "../utils/image-validation";
import { ValidationError } from "../utils/validation-error";

export type AcademyPhoto = { id: string; url: string; alt: string };
export const originalAcademyPhoto: AcademyPhoto = {
  id: "original",
  url: "/assets/training.png",
  alt: "Entrenamiento de grappling en Team Vivas Academy",
};
export async function listAcademyPhotos(): Promise<AcademyPhoto[]> {
  const { data, error } = await getSupabase()
    .from("academy_photos")
    .select("id,url,alt")
    .order("created_at")
    .order("id");
  if (error) throw error;
  return [originalAcademyPhoto, ...(data ?? [])];
}
export async function addAcademyPhoto(file: File, alt: string) {
  await validateImageFile(file);
  const bitmap = await createImageBitmap(file);
  const valid =
    bitmap.width > 0 &&
    bitmap.height > 0 &&
    bitmap.width <= 10000 &&
    bitmap.height <= 10000;
  bitmap.close();
  if (!valid)
    throw new ValidationError(
      "La imagen supera las dimensiones admitidas (10000 × 10000).",
    );
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[file.type];
  const path = `${crypto.randomUUID()}.${extension}`;
  const client = getSupabase();
  const bucket = client.storage.from("academy-images");
  const uploaded = await bucket.upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploaded.error) throw uploaded.error;
  const { error } = await client.from("academy_photos").insert({
    url: bucket.getPublicUrl(path).data.publicUrl,
    alt: alt.trim().slice(0, 250) || "Entrenamiento en Team Vivas Academy",
  });
  if (error) {
    await bucket.remove([path]);
    throw error;
  }
}
