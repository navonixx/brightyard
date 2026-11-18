import "server-only";

export function imagekitEnabled(): boolean {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY);
}

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** Server-side upload through the ImageKit Upload API. Returns the public URL. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!key) throw new Error("IMAGEKIT_PRIVATE_KEY is not set.");
  if (!ALLOWED.includes(file.type)) throw new Error(`Unsupported file type: ${file.type}`);
  if (file.size > MAX_BYTES) throw new Error("Image is larger than 8 MB.");

  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name.replace(/[^\w.-]+/g, "-").slice(-80) || "image");
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
    body: form,
    cache: "no-store",
  });
  const data = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !data.url) throw new Error(data.message || `ImageKit error ${response.status}`);
  return data.url;
}
