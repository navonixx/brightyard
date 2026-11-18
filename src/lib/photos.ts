import type { LeadImage, Trade } from "./db/schema";

/** AI-generated sample photography in /public/showcase (made with gpt-image-1.5). */
export const PHOTO = {
  yard: "/showcase/yard.webp",
  yard2: "/showcase/yard-2.webp",
  yard3: "/showcase/yard-3.webp",
  bakery: "/showcase/bakery.webp",
  bakery2: "/showcase/bakery-2.webp",
  bakery3: "/showcase/bakery-3.webp",
  salon: "/showcase/salon.webp",
  salon2: "/showcase/salon-2.webp",
  salon3: "/showcase/salon-3.webp",
  gym: "/showcase/gym.webp",
  gym2: "/showcase/gym-2.webp",
  gym3: "/showcase/gym-3.webp",
  cafe: "/showcase/cafe.webp",
  cafe2: "/showcase/cafe-2.webp",
  cafe3: "/showcase/cafe-3.webp",
  paint: "/showcase/paint.webp",
  paint2: "/showcase/paint-2.webp",
  paint3: "/showcase/paint-3.webp",
  kitchen: "/showcase/kitchen.webp",
  tools: "/showcase/tools.webp",
  driveway: "/showcase/driveway.webp",
  storefront: "/showcase/storefront.webp",
} as const;

/** Placeholder hero photo used on a prospect's preview until real photos are added. */
export const TRADE_FALLBACK: Record<Trade, LeadImage> = {
  landscaping: { url: PHOTO.yard, alt: "Freshly landscaped front yard" },
  painting: { url: PHOTO.paint2, alt: "Freshly painted house exterior" },
  cleaning: { url: PHOTO.kitchen, alt: "Spotless kitchen after a deep clean" },
  handyman: { url: PHOTO.tools, alt: "Hand tools on a workbench" },
  pressure_washing: { url: PHOTO.driveway, alt: "Half pressure-washed driveway" },
  other: { url: PHOTO.storefront, alt: "Local storefront in morning light" },
};
