import "server-only";
import type { NewLead } from "../leads";
import { runGoogle } from "./google";
import { runOsm } from "./osm";
import { runOverture } from "./overture";
import { runSec } from "./sec";
import { runYouTube } from "./youtube";

export type SourceKey = "overture" | "osm" | "google" | "youtube" | "sec";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const RUNNERS: Record<SourceKey, (params: any) => Promise<{ leads: NewLead[]; note: string }>> = {
  overture: runOverture,
  osm: runOsm,
  google: runGoogle,
  youtube: runYouTube,
  sec: runSec,
};
