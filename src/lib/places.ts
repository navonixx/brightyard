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
  // Keys enabled only for the legacy "Places API" get 403 here — use the legacy endpoints instead.
  if (response.status === 403) return searchPlacesLegacy(query, key);
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

type LegacySearch = {
  status: string;
  error_message?: string;
  results?: { place_id: string; name: string; rating?: number; user_ratings_total?: number; business_status?: string }[];
};
type LegacyDetails = {
  result?: {
    website?: string;
    formatted_phone_number?: string;
    address_components?: { short_name: string; types: string[] }[];
  };
};

/** Legacy Places API: text search, then one details call per place for website and phone. */
async function searchPlacesLegacy(query: string, key: string): Promise<PlaceResult[]> {
  const base = "https://maps.googleapis.com/maps/api/place";
  const search = (await fetch(`${base}/textsearch/json?query=${encodeURIComponent(query)}&region=us&key=${key}`, {
    cache: "no-store",
  }).then((r) => r.json())) as LegacySearch;
  if (search.status !== "OK" && search.status !== "ZERO_RESULTS") {
    throw new Error(search.error_message || `Places API error: ${search.status}`);
  }
  const places = (search.results ?? []).filter((p) => p.business_status !== "CLOSED_PERMANENTLY").slice(0, 20);

  return Promise.all(
    places.map(async (place) => {
      const details = (await fetch(
        `${base}/details/json?place_id=${place.place_id}&fields=website,formatted_phone_number,address_components&key=${key}`,
        { cache: "no-store" },
      )
        .then((r) => r.json())
        .catch(() => ({}))) as LegacyDetails;
      const part = (type: string) =>
        details.result?.address_components?.find((c) => c.types.includes(type))?.short_name ?? null;
      return {
        placeId: place.place_id,
        name: place.name,
        phone: details.result?.formatted_phone_number ?? null,
        website: details.result?.website ?? null,
        rating: place.rating ?? null,
        reviewCount: place.user_ratings_total ?? null,
        city: part("locality"),
        state: part("administrative_area_level_1"),
      };
    }),
  );
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
