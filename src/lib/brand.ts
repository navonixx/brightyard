import type { Trade } from "./db/schema";

export const BRAND = {
  name: "Brightyard",
  tagline: "Websites for home-service pros — built before you pay.",
  niche: "US home-service businesses (landscapers, painters, cleaners, handymen, pressure washers)",
  contactEmail: "hello@brightyard.studio",
  suggestedPrices: [49, 99, 149, 199],
};

export const TRADE_META: Record<
  Trade,
  { label: string; accent: string; accentSoft: string; noun: string }
> = {
  landscaping: { label: "Landscaping", accent: "#2F7D4F", accentSoft: "#E4F1E8", noun: "lawn & landscape" },
  painting: { label: "House painting", accent: "#3B5BDB", accentSoft: "#E6EBFC", noun: "painting" },
  cleaning: { label: "House cleaning", accent: "#0F8B8D", accentSoft: "#DDF3F3", noun: "cleaning" },
  handyman: { label: "Handyman", accent: "#D9480F", accentSoft: "#FDE9DF", noun: "handyman" },
  pressure_washing: { label: "Pressure washing", accent: "#1971C2", accentSoft: "#E1EEFA", noun: "pressure washing" },
  other: { label: "Home services", accent: "#495057", accentSoft: "#ECEEF0", noun: "home service" },
};

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
