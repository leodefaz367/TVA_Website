import Image, { type ImageProps } from "next/image";
import { safeImageSource } from "../utils/image-validation";
// Serve original local and Supabase assets without an unconfigured Cloudflare IMAGES binding.
export default function SiteImage({
  width = 1200,
  height = 800,
  alt,
  src,
  ...props
}: ImageProps) {
  return (
    <Image
      width={width}
      height={height}
      alt={alt}
      {...props}
      src={
        typeof src === "string"
          ? safeImageSource(src, import.meta.env.VITE_SUPABASE_URL)
          : src
      }
      unoptimized
    />
  );
}
