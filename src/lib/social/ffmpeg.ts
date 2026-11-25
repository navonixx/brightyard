import "server-only";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";

/**
 * ffmpeg for stitching scene clips into one reel with music.
 * Bundling the binary into the Vercel function doesn't work with Turbopack, so on Linux it is
 * downloaded once per warm instance into /tmp from the ffmpeg-static release and checked against a
 * pinned SHA-256. Locally (Windows) set FFMPEG_PATH to any ffmpeg binary.
 */
const FFMPEG_URL = "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64.gz";
const FFMPEG_SHA256 = "17c1ae10b52ac499180679fe6ba77e17642390c4eedb0f1e3b0ac045da55128f";

const g = globalThis as unknown as { __ffmpeg?: Promise<string> };

export function ffmpegPath(): Promise<string> {
  if (process.env.FFMPEG_PATH) return Promise.resolve(process.env.FFMPEG_PATH);
  g.__ffmpeg ??= (async () => {
    if (process.platform !== "linux" || process.arch !== "x64") throw new Error("Set FFMPEG_PATH to an ffmpeg binary on this machine.");
    const target = path.join(os.tmpdir(), "ffmpeg-b6");
    try {
      await access(target, constants.X_OK);
      return target;
    } catch {
      /* not downloaded yet */
    }
    const res = await fetch(FFMPEG_URL, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`Couldn't download ffmpeg (${res.status})`);
    const gz = Buffer.from(await res.arrayBuffer());
    const sum = createHash("sha256").update(gz).digest("hex");
    if (sum !== FFMPEG_SHA256) throw new Error("ffmpeg download failed its checksum — not running it.");
    await writeFile(target, gunzipSync(gz));
    await chmod(target, 0o755);
    return target;
  })().catch((e) => {
    g.__ffmpeg = undefined;
    throw e;
  });
  return g.__ffmpeg;
}

function run(bin: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + String(d)).slice(-2000)));
    const timer = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (${code}): ${err.split("\n").slice(-4).join(" ").slice(0, 400)}`));
    });
  });
}

async function download(url: string, file: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`Couldn't download ${url.slice(0, 80)} (${res.status})`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

/**
 * Joins the clips (each trimmed to `clipSeconds`) with short crossfades into a 720×1280, 30 fps
 * reel and lays the music under it with a fade in/out. Returns the MP4 bytes.
 */
export async function composeReel(opts: { clips: string[]; musicUrl?: string | null; clipSeconds?: number; musicStart?: number }): Promise<{ mp4: Buffer; seconds: number }> {
  const bin = await ffmpegPath();
  const dir = path.join(os.tmpdir(), `reel-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    const clipLen = opts.clipSeconds ?? 5;
    const fade = 0.5;
    const n = opts.clips.length;
    await Promise.all(opts.clips.map((u, i) => download(u, path.join(dir, `c${i}.mp4`))));
    const hasMusic = Boolean(opts.musicUrl);
    if (hasMusic) await download(opts.musicUrl!, path.join(dir, "music.mp3"));
    const total = n * clipLen - (n - 1) * fade;

    const inputs = opts.clips.flatMap((_, i) => ["-i", path.join(dir, `c${i}.mp4`)]);
    if (hasMusic) inputs.push("-i", path.join(dir, "music.mp3"));
    const parts: string[] = opts.clips.map(
      (_, i) => `[${i}:v]trim=0:${clipLen},setpts=PTS-STARTPTS,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,setsar=1,format=yuv420p[v${i}]`,
    );
    let last = "v0";
    for (let i = 1; i < n; i++) {
      const out = i === n - 1 ? "vout" : `x${i}`;
      parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${fade}:offset=${(i * (clipLen - fade)).toFixed(2)}[${out}]`);
      last = out;
    }
    if (n === 1) parts.push(`[v0]null[vout]`);
    if (hasMusic) {
      const start = Math.max(0, opts.musicStart ?? 0);
      parts.push(`[${n}:a]atrim=${start}:${(start + total).toFixed(2)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5,volume=0.85[aout]`);
    }
    const out = path.join(dir, "out.mp4");
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      ...inputs,
      "-filter_complex",
      parts.join(";"),
      "-map",
      "[vout]",
      ...(hasMusic ? ["-map", "[aout]", "-c:a", "aac", "-b:a", "128k"] : ["-an"]),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-t",
      total.toFixed(2),
      out,
    ];
    await run(bin, args, 200_000);
    return { mp4: await readFile(out), seconds: total };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
