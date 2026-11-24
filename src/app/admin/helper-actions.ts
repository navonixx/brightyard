"use server";

import { requireAdmin } from "@/lib/auth";
import { helperReply, type ChatMessage } from "@/lib/helper/chat";

export async function helperAsk(messages: ChatMessage[], path: string): Promise<{ ok: boolean; text: string }> {
  await requireAdmin();
  const clean: ChatMessage[] = (Array.isArray(messages) ? messages : [])
    .slice(-12)
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      text: String(m.text ?? "").slice(0, 4000),
      image: typeof m.image === "string" && m.image.startsWith("data:image/") && m.image.length < 4_000_000 ? m.image : undefined,
    }))
    .filter((m) => m.text || m.image);
  if (!clean.length || clean.at(-1)!.role !== "user") return { ok: false, text: "Kuch poochho 🙂" };
  // Only the latest image is sent again; older screenshots are dropped to keep requests small.
  const lastImage = clean.map((m) => Boolean(m.image)).lastIndexOf(true);
  const trimmed = clean.map((m, i) => (i === lastImage ? m : { ...m, image: undefined }));
  try {
    return { ok: true, text: (await helperReply(trimmed, String(path).slice(0, 200))) || "Hmm, jawab khaali aaya — dobara poochho." };
  } catch (e) {
    console.error("helperAsk failed", e);
    return { ok: false, text: "Abhi jawab nahi aa paya (AI service ka error). Thodi der baad dobara try karo." };
  }
}
