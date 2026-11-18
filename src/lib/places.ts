import "server-only";

export type PlaceResult = {
  placeId: string;
  name: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  city: string | null;
  state: string | null;
};

type PlacesResponse = {
  places?: {
    id: string;
    displayName?: { text: string };
    nationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    addressComponents?: { shortText: string; types: string[] }[];
    businessStatus?: string;
  }[];
  error?: { message: string };
};

export function placesEnabled(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

/** Google Places API (New) Text Search — e.g. "landscaping in Boise, ID". */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set.");

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.addressComponents,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: query, regionCode: "US", pageSize: 20 }),
    cache: "no-store",
  });
  const data = (await response.json()) as PlacesResponse;
  if (!response.ok) throw new Error(data.error?.message || `Places API error ${response.status}`);

  return (data.places ?? [])
    .filter((place) => place.businessStatus !== "CLOSED_PERMANENTLY")
    .map((place) => {
      const part = (type: string) =>
        place.addressComponents?.find((c) => c.types.includes(type))?.shortText ?? null;
      return {
        placeId: place.id,
        name: place.displayName?.text ?? "Unknown",
        phone: place.nationalPhoneNumber ?? null,
        website: place.websiteUri ?? null,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        city: part("locality"),
        state: part("administrative_area_level_1"),
      };
    });
}

/** Higher = better prospect. No website + good reviews is the sweet spot. */
export function scoreLead(lead: {
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  email?: string | null;
}): number {
  let score = 0;
  if (!lead.website) score += 40;
  else if (/facebook\.com|instagram\.com|yelp\.com|business\.site|linktr\.ee/i.test(lead.website)) score += 30;
  if ((lead.rating ?? 0) >= 4.5) score += 20;
  else if ((lead.rating ?? 0) >= 4.0) score += 10;
  if ((lead.reviewCount ?? 0) >= 20) score += 20;
  else if ((lead.reviewCount ?? 0) >= 8) score += 10;
  if (lead.email) score += 20;
  return score;
}
