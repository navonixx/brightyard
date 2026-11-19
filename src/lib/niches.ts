import type { Trade } from "./db/schema";

export type Niche = {
  key: string;
  label: string;
  /** Google searches run in order until the city's target is reached. */
  queries: string[];
  trade: Trade;
};

/** 20 local home-service niches: owner-run, often on dated sites, and a new client is worth a lot to them. */
export const NICHES: Niche[] = [
  { key: "roofing", label: "Roofing", queries: ["roofing contractor", "roofer", "roof repair"], trade: "other" },
  { key: "plumbing", label: "Plumbing", queries: ["plumber", "plumbing company", "drain cleaning service"], trade: "other" },
  { key: "hvac", label: "HVAC", queries: ["HVAC contractor", "air conditioning repair", "heating and cooling company"], trade: "other" },
  { key: "electrician", label: "Electrician", queries: ["electrician", "electrical contractor", "residential electrician"], trade: "other" },
  { key: "landscaping", label: "Landscaping & lawn", queries: ["landscaping company", "lawn care service", "landscaper"], trade: "landscaping" },
  { key: "tree_service", label: "Tree service", queries: ["tree service", "tree removal", "arborist"], trade: "landscaping" },
  { key: "painting", label: "House painting", queries: ["house painter", "painting contractor", "interior painting"], trade: "painting" },
  { key: "pest_control", label: "Pest control", queries: ["pest control", "exterminator", "termite control"], trade: "other" },
  { key: "house_cleaning", label: "House cleaning", queries: ["house cleaning service", "maid service", "cleaning company"], trade: "cleaning" },
  { key: "carpet_cleaning", label: "Carpet cleaning", queries: ["carpet cleaning", "carpet and upholstery cleaning", "tile and grout cleaning"], trade: "cleaning" },
  { key: "pressure_washing", label: "Pressure washing", queries: ["pressure washing", "power washing", "soft washing"], trade: "pressure_washing" },
  { key: "garage_door", label: "Garage doors", queries: ["garage door repair", "garage door company", "garage door installation"], trade: "other" },
  { key: "fencing", label: "Fencing", queries: ["fence contractor", "fence company", "fence installation"], trade: "other" },
  { key: "concrete", label: "Concrete", queries: ["concrete contractor", "concrete driveway contractor", "stamped concrete"], trade: "other" },
  { key: "handyman", label: "Handyman", queries: ["handyman", "handyman service", "home repair service"], trade: "handyman" },
  { key: "flooring", label: "Flooring", queries: ["flooring contractor", "flooring installation", "hardwood floor refinishing"], trade: "other" },
  { key: "remodeling", label: "Remodeling", queries: ["remodeling contractor", "kitchen remodeling", "bathroom remodeling"], trade: "other" },
  { key: "gutters", label: "Gutters", queries: ["gutter installation", "gutter cleaning", "seamless gutters"], trade: "other" },
  { key: "pool_service", label: "Pool service", queries: ["pool service", "pool cleaning", "pool repair"], trade: "other" },
  { key: "junk_removal", label: "Junk removal", queries: ["junk removal", "junk hauling", "dumpster rental"], trade: "other" },
];

/** Mid-size US cities: plenty of owner-run businesses, less agency competition than the big metros. */
export const MARKETS: { value: string; recommended?: boolean }[] = [
  { value: "Tulsa, OK", recommended: true },
  { value: "Omaha, NE", recommended: true },
  { value: "Wichita, KS", recommended: true },
  { value: "Knoxville, TN", recommended: true },
  { value: "Boise, ID", recommended: true },
  { value: "Des Moines, IA" },
  { value: "Little Rock, AR" },
  { value: "Albuquerque, NM" },
  { value: "Spokane, WA" },
  { value: "Chattanooga, TN" },
  { value: "Greenville, SC" },
  { value: "Springfield, MO" },
  { value: "Lubbock, TX" },
  { value: "Fort Wayne, IN" },
  { value: "Grand Rapids, MI" },
  { value: "Baton Rouge, LA" },
  { value: "Akron, OH" },
  { value: "Fresno, CA" },
  { value: "Reno, NV" },
  { value: "Lexington, KY" },
  { value: "Huntsville, AL" },
  { value: "Sioux Falls, SD" },
  { value: "Fargo, ND" },
  { value: "Billings, MT" },
];

/** Niche by key; a typed-in niche becomes its own search. */
export function nicheFor(key: string): Niche {
  return (
    NICHES.find((n) => n.key === key) ?? {
      key,
      label: key,
      queries: [key, `${key} company`, `${key} service`],
      trade: "other",
    }
  );
}

export const nicheLabel = (key: string) => nicheFor(key).label;
