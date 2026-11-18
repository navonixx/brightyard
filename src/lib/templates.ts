import type { SampleContent, Trade } from "./db/schema";

type Input = {
  businessName: string;
  trade: Trade;
  city?: string | null;
  state?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
};

const SERVICES: Record<Trade, { title: string; description: string }[]> = {
  landscaping: [
    { title: "Weekly lawn care", description: "Mowing, edging and blowing on a schedule you never have to think about." },
    { title: "Landscape design", description: "Beds, shrubs and stone work planned around how you actually use your yard." },
    { title: "Seasonal cleanups", description: "Spring and fall cleanups that leave every corner sharp and tidy." },
    { title: "Mulch & planting", description: "Fresh mulch, healthy plants and clean lines that last all season." },
  ],
  painting: [
    { title: "Interior painting", description: "Clean lines, protected floors and rooms ready to live in the same day." },
    { title: "Exterior painting", description: "Proper prep and premium paint that stands up to sun and rain." },
    { title: "Cabinet refinishing", description: "A brand-new kitchen look for a fraction of replacement cost." },
    { title: "Drywall repair", description: "Patches and cracks fixed so smooth you can't find them." },
  ],
  cleaning: [
    { title: "Recurring cleaning", description: "Weekly or bi-weekly visits by the same trusted team." },
    { title: "Deep cleaning", description: "Top-to-bottom detail work for kitchens, baths and everything between." },
    { title: "Move-in / move-out", description: "Get your deposit back or start fresh in a spotless home." },
    { title: "Office cleaning", description: "Reliable after-hours cleaning for small offices and studios." },
  ],
  handyman: [
    { title: "Repairs & fixes", description: "Doors, drywall, fixtures and the to-do list you keep putting off." },
    { title: "Installations", description: "TVs, shelves, lighting and furniture installed level and secure." },
    { title: "Carpentry", description: "Trim, decks and custom pieces built to last." },
    { title: "Home maintenance", description: "Seasonal checkups that catch small problems before they grow." },
  ],
  pressure_washing: [
    { title: "House washing", description: "Soft-wash siding cleaning that's safe for paint and plants." },
    { title: "Driveways & walkways", description: "Oil, grime and mildew lifted for a like-new surface." },
    { title: "Deck & fence cleaning", description: "Restore wood and vinyl before staining or sealing." },
    { title: "Roof soft washing", description: "Remove black streaks and moss without damaging shingles." },
  ],
  other: [
    { title: "Residential service", description: "Dependable work for homeowners, done right the first time." },
    { title: "Commercial service", description: "Flexible scheduling for local businesses and property managers." },
    { title: "Free estimates", description: "Clear, upfront pricing before any work begins." },
    { title: "Emergency visits", description: "Fast response when something can't wait." },
  ],
};

/** Deterministic homepage copy used when the Claude API key isn't configured. */
export function templateSample(input: Input): SampleContent {
  const place = [input.city, input.state].filter(Boolean).join(", ") || "your area";
  const city = input.city || "your area";
  const proof =
    input.rating && input.reviewCount
      ? `Rated ${input.rating.toFixed(1)}★ by ${input.reviewCount} neighbors on Google.`
      : "Locally owned, fully insured and easy to reach.";

  const headlines: Record<Trade, string> = {
    landscaping: `${city}'s yards, done right.`,
    painting: `Fresh paint. Clean lines. Zero stress.`,
    cleaning: `Come home to a spotless house.`,
    handyman: `Your to-do list, finally done.`,
    pressure_washing: `Make your home look new again.`,
    other: `Reliable service in ${city}.`,
  };

  return {
    headline: headlines[input.trade],
    subheadline: `${input.businessName} serves homeowners across ${place}. ${proof}`,
    services: SERVICES[input.trade],
    whyUs: [
      "Fast replies — usually the same day",
      "Upfront pricing with no surprises",
      "Local, insured and proud of our reviews",
    ],
    about: `${input.businessName} is a local team that treats every home like our own. We show up on time, communicate clearly and don't call a job finished until you're happy with it.`,
    cta: "Get a free quote",
    serviceArea: `${place} and nearby neighborhoods`,
  };
}

export function templateEmail(input: {
  businessName: string;
  ownerName?: string | null;
  city?: string | null;
  trade: Trade;
  website?: string | null;
  link: string;
}): { subject: string; body: string } {
  const hi = input.ownerName ? `Hi ${input.ownerName.split(" ")[0]},` : "Hi there,";
  const observation = input.website
    ? "thought your site could show off your work a lot better"
    : "noticed you don't have a website yet";
  return {
    subject: `made a homepage for ${input.businessName}`,
    body: `${hi}

I came across ${input.businessName}${input.city ? ` while looking at ${input.city} businesses` : ""} and ${observation}, so I went ahead and built you a homepage preview:

${input.link}

It's free to look at. If you like it, you can pay whatever you think it's worth and I'll put it live on your own domain. If not, no worries at all.

Would you want any changes?`,
  };
}
