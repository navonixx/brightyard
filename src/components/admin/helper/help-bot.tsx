"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ImagePlus, Loader2, MessageCircleQuestion, Send, Trash2, X } from "lucide-react";
import { helperAsk } from "@/app/admin/helper-actions";

type Msg = { role: "user" | "assistant"; text: string; image?: string };

const STORE = "alderwell-helper-chat";
const SUGGESTIONS = ["Instagram/Facebook connect kaise karun?", "Email ek saath kaise bheju?", "Hot lead kya hota hai?", "Aaj mujhe kya karna chahiye?"];

/** Tiny safe formatter: **bold**, `code`, links and line breaks / lists. */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  const inline = (s: string, key: number): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)]+)/g).map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>;
      if (/^`[^`]+`$/.test(part)) return <code key={`${key}-${i}`} className="rounded bg-black/5 px-1 text-[12px]">{part.slice(1, -1)}</code>;
      if (/^https?:\/\//.test(part)) return <a key={`${key}-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline">{part}</a>;
      return part;
    });
  return (
    <div className="space-y-1">
      {lines.map((l, i) =>
        l.trim() === "" ? <div key={i} className="h-1" /> : /^\s*([-*•]|\d+[.)])\s+/.test(l) ? (
          <p key={i} className="pl-3 -indent-3">{inline(l.replace(/^\s*[-*•]\s+/, "• "), i)}</p>
        ) : (
          <p key={i}>{inline(l.replace(/^#+\s*/, ""), i)}</p>
        ),
      )}
    </div>
  );
}

/** Screenshots are shrunk in the browser (max 1280 px, JPEG) before they're sent. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function HelpBot() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // One line when empty; grows with the text up to ~6 lines, then scrolls. Modern browsers do this
  // with CSS `field-sizing: content`; older ones get the same result from this small fallback.
  useEffect(() => {
    const el = input.current;
    if (!el || (typeof CSS !== "undefined" && CSS.supports("field-sizing", "content"))) return;
    el.style.height = "auto";
    if (text) el.style.height = `${Math.min(el.scrollHeight + 2, 160)}px`;
  }, [text, open]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) setMsgs(JSON.parse(saved));
    } catch {
      /* private mode: start fresh */
    }
  }, []);
  useEffect(() => {
    try {
      // Keep the text history only (screenshots are too big to store).
      localStorage.setItem(STORE, JSON.stringify(msgs.slice(-30).map((m) => ({ role: m.role, text: m.text }))));
    } catch {
      /* ignore */
    }
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const ask = (question: string) => {
    const q = question.trim();
    if ((!q && !image) || pending) return;
    const next: Msg[] = [...msgs, { role: "user", text: q, image: image ?? undefined }];
    setMsgs(next);
    setText("");
    setImage(null);
    start(async () => {
      try {
        const r = await helperAsk(next.map((m) => ({ role: m.role, text: m.text, image: m.image })), path);
        setMsgs((m) => [...m, { role: "assistant", text: r.text }]);
      } catch {
        setMsgs((m) => [...m, { role: "assistant", text: "Connection toot gaya — dobara bhejo." }]);
      }
    });
  };

  const attach = async (f: File | undefined | null) => {
    if (f && f.type.startsWith("image/")) setImage(await shrink(f));
  };

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:scale-105"
          aria-label="Open helper"
        >
          <MessageCircleQuestion className="size-5" /> Help
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(620px,calc(100dvh-2rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-line bg-brand px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Alderwell Helper</p>
              <p className="text-[11px] opacity-80">Is app ke baare mein kuch bhi poochho · screenshot bhi paste kar sakte ho</p>
            </div>
            <div className="flex items-center gap-1">
              {msgs.length ? (
                <button type="button" onClick={() => setMsgs([])} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Clear chat" title="Clear chat">
                  <Trash2 className="size-4" />
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close helper">
                <X className="size-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-paper p-3 text-sm">
            {!msgs.length ? (
              <div className="space-y-3">
                <p className="rounded-xl bg-card p-3">
                  Namaste! 👋 Main is admin ka helper hoon. Koi step samajh na aaye, error aaye, ya agla kya karna hai — poochho. Screen ka screenshot paste karoge to dekh kar bataunga.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs hover:border-brand hover:text-brand">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-brand text-white" : "bg-card text-ink"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.image ? <img src={m.image} alt="Screenshot" className="mb-2 max-h-40 rounded-lg" /> : null}
                  {m.role === "assistant" ? <Rich text={m.text} /> : <p className="whitespace-pre-wrap">{m.text}</p>}
                </div>
              </div>
            ))}
            {pending ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="size-3.5 animate-spin" /> soch raha hoon…
              </div>
            ) : null}
            <div ref={end} />
          </div>

          <form
            className="border-t border-line p-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            {image ? (
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Attached screenshot" className="h-12 rounded-md border border-line" />
                <button type="button" onClick={() => setImage(null)} className="text-xs text-muted hover:text-danger">remove</button>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => file.current?.click()} className="rounded-lg p-2 text-muted hover:bg-paper hover:text-ink" aria-label="Attach screenshot" title="Attach screenshot">
                <ImagePlus className="size-5" />
              </button>
              <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => attach(e.target.files?.[0])} />
              <textarea
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={(e) => {
                  const item = [...e.clipboardData.items].find((it) => it.type.startsWith("image/"));
                  if (item) {
                    e.preventDefault();
                    void attach(item.getAsFile());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(text);
                  }
                }}
                rows={1}
                placeholder="Kuch bhi poochho…"
                title="Enter = bhejo · Shift+Enter = nayi line · Ctrl+V = screenshot paste"
                className="max-h-40 min-h-10 flex-1 resize-none overflow-y-auto rounded-xl border border-line bg-paper px-3 py-2 text-sm leading-5 outline-none [field-sizing:content] focus:border-brand"
              />
              <button type="submit" disabled={pending || (!text.trim() && !image)} className="rounded-xl bg-brand p-2.5 text-white disabled:opacity-40" aria-label="Send">
                <Send className="size-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
