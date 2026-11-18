import type { Trade } from "./db/schema";
import { templateSample } from "./templates";

// Fictional example businesses for the public showcase. Phone numbers use the 555 range.
const BASE = [
  {
    slug: "greenline-lawn",
    businessName: "Greenline Lawn Co.",
    trade: "landscaping" as Trade,
    city: "Austin",
    state: "TX",
    phone: "(512) 555-0142",
    rating: 4.9,
    reviewCount: 87,
  },
  {
    slug: "fresh-coat-painting",
    businessName: "Fresh Coat Painting",
    trade: "painting" as Trade,
    city: "Raleigh",
    state: "NC",
    phone: "(919) 555-0178",
    rating: 4.8,
    reviewCount: 54,
  },
  {
    slug: "sparkle-and-co",
    businessName: "Sparkle & Co. Cleaning",
    trade: "cleaning" as Trade,
    city: "Boise",
    state: "ID",
    phone: "(208) 555-0119",
    rating: 5.0,
    reviewCount: 41,
  },
];

export const DEMOS = BASE.map((demo) => ({
  ...demo,
  sample: templateSample(demo),
}));

export function getDemo(slug: string) {
  return DEMOS.find((demo) => demo.slug === slug);
}
