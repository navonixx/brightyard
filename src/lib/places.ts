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
    formattedAddress?: string;
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

// ─── Legacy Places API, page by page (used by the bulk harvester) ──────

const LEGACY = "https://maps.googleapis.com/maps/api/place";

export type LegacyHit = {
  placeId: string;
  name: string;
  address: string | null;
  /** Two-letter state parsed from the address, e.g. "OK". */
  state: string | null;
  rating: number | null;
  reviewCount: number | null;
  lat: number | null;
  lng: number | null;
};

type LegacyPage = {
  status: string;
  error_message?: string;
  next_page_token?: string;
  results?: {
    place_id: string;
    name: string;
    formatted_address?: string;
    vicinity?: string;
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    geometry?: { location?: { lat: number; lng: number } };
  }[];
};

/**
 * One page (up to 20) of a legacy search. Google allows 3 pages (60) per query;
 * a next-page token only becomes valid a couple of seconds after it is issued.
 * With a location it runs a Nearby Search: the best matches inside that circle only,
 * which is how the suburbs turn up businesses a city-wide search never shows.
 */
export async function legacyTextSearch(
  query: string,
  opts: { pageToken?: string | null; location?: { lat: number; lng: number }; radius?: number } = {},
): Promise<{ hits: LegacyHit[]; nextPageToken: string | null }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set.");
  const params = new URLSearchParams({ key });
  const endpoint = opts.location ? "nearbysearch" : "textsearch";
  if (opts.pageToken) params.set("pagetoken", opts.pageToken);
  else if (opts.location) {
    params.set("keyword", query);
    params.set("location", `${opts.location.lat},${opts.location.lng}`);
    params.set("radius", String(opts.radius ?? 8000));
  } else {
    params.set("query", query);
    params.set("region", "us");
  }
  let data: LegacyPage = { status: "UNKNOWN" };
  for (let attempt = 0; attempt < 3; attempt++) {
    data = (await fetch(`${LEGACY}/${endpoint}/json?${params}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }).then((r) =>
      r.json(),
    )) as LegacyPage;
    // A fresh page token answers INVALID_REQUEST until it is ready.
    if (!(opts.pageToken && data.status === "INVALID_REQUEST")) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (data.status === "ZERO_RESULTS" || (opts.pageToken && data.status === "INVALID_REQUEST")) return { hits: [], nextPageToken: null };
  if (data.status !== "OK") throw new Error(data.error_message || `Places API error: ${data.status}`);

  const hits = (data.results ?? [])
    .filter((r) => r.business_status !== "CLOSED_PERMANENTLY")
    .map((r) => ({
      placeId: r.place_id,
      name: r.name,
      address: r.formatted_address ?? r.vicinity ?? null,
      state: r.formatted_address?.match(/,\s*([A-Z]{2})\s+\d{5}/)?.[1] ?? null,
      rating: r.rating ?? null,
      reviewCount: r.user_ratings_total ?? null,
      lat: r.geometry?.location?.lat ?? null,
      lng: r.geometry?.location?.lng ?? null,
    }));
  return { hits, nextPageToken: data.next_page_token ?? null };
}

/** Website, phone and city for one place (Place Details + Contact Data). */
export async function legacyPlaceDetails(placeId: string): Promise<{ website: string | null; phone: string | null; city: string | null }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set.");
  const data = (await fetch(
    `${LEGACY}/details/json?place_id=${encodeURIComponent(placeId)}&fields=website,formatted_phone_number,address_components&key=${key}`,
    { cache: "no-store", signal: AbortSignal.timeout(12000) },
  )
    .then((r) => r.json())
    .catch(() => ({}))) as LegacyDetails;
  return {
    website: data.result?.website ?? null,
    phone: data.result?.formatted_phone_number ?? null,
    city: data.result?.address_components?.find((c) => c.types.includes("locality"))?.short_name ?? null,
  };
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
