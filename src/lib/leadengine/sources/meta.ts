/** Display info for each source (safe to import in client components). */
export const SOURCES = {
  overture: { label: "Overture Maps", short: "Overture", cost: "Free", color: "#22d3ee", about: "Open data from Meta, Microsoft & Foursquare — ~70M places with websites, phones, emails and Facebook pages." },
  osm: { label: "OpenStreetMap", short: "OSM", cost: "Free", color: "#4ade80", about: "Community-mapped businesses; good extra coverage and contact tags." },
  google: { label: "Google Places", short: "Google", cost: "Paid after free tier", color: "#facc15", about: "Most accurate listings plus rating and review count. Runs only within your monthly limit." },
  youtube: { label: "YouTube channels", short: "YouTube", cost: "Free (daily quota)", color: "#f87171", about: "US channels for any topic — creators, coaches and businesses — with links from their channel description." },
  sec: { label: "SEC Form D (funded companies)", short: "SEC", cost: "Free", color: "#c084fc", about: "Companies that just raised money: address, phone, executives and amount raised." },
} as const;

export type SourceId = keyof typeof SOURCES;
