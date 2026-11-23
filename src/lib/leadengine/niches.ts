/**
 * Business types we look for. Each one knows how it is named on every source:
 * Overture taxonomy ids, OpenStreetMap tags and Google search phrases.
 * `ticket` = how much one customer is worth to that business → how easily it can pay us.
 */
export type Ticket = "high" | "mid" | "low";
export type Niche = {
  key: string;
  label: string;
  group: string;
  ticket: Ticket;
  overture: string[];
  osm: [key: string, value: string][];
  google: string[];
};

export const NICHES: Niche[] = [
  // ── Health (high value per patient) ──
  { key: "dentist", label: "Dentists & orthodontists", group: "Health", ticket: "high", overture: ["dental_clinic", "general_dentistry", "cosmetic_dentistry", "orthodontics", "pediatric_dentistry", "oral_and_maxillofacial_surgery"], osm: [["amenity", "dentist"], ["healthcare", "dentist"]], google: ["dentist", "orthodontist"] },
  { key: "med_spa", label: "Med spas", group: "Health", ticket: "high", overture: ["medical_spa"], osm: [], google: ["med spa", "botox clinic"] },
  { key: "plastic_surgery", label: "Plastic surgeons", group: "Health", ticket: "high", overture: ["plastic_and_reconstructive_surgery"], osm: [], google: ["plastic surgeon"] },
  { key: "dermatology", label: "Dermatology", group: "Health", ticket: "high", overture: ["dermatology"], osm: [], google: ["dermatologist"] },
  { key: "chiropractor", label: "Chiropractors", group: "Health", ticket: "mid", overture: ["chiropractic"], osm: [["healthcare:speciality", "chiropractic"]], google: ["chiropractor"] },
  { key: "physical_therapy", label: "Physical therapy", group: "Health", ticket: "mid", overture: ["physical_therapy"], osm: [["healthcare", "physiotherapist"]], google: ["physical therapy clinic"] },
  { key: "optometry", label: "Eye care", group: "Health", ticket: "mid", overture: ["optometry", "vision_or_eye_care_clinic"], osm: [["healthcare", "optometrist"], ["shop", "optician"]], google: ["optometrist"] },
  { key: "doctors", label: "Clinics & doctors", group: "Health", ticket: "mid", overture: ["doctors_office", "family_practice", "internal_medicine", "pediatric_clinic", "urgent_care_clinic", "weight_loss_center"], osm: [["amenity", "doctors"]], google: ["family doctor clinic"] },
  { key: "counseling", label: "Therapy & counseling", group: "Health", ticket: "mid", overture: ["counseling", "psychology", "psychiatry", "behavioral_or_mental_health_clinic"], osm: [["healthcare", "psychotherapist"]], google: ["therapist counseling"] },
  { key: "senior_care", label: "Home health & senior care", group: "Health", ticket: "high", overture: ["home_health_care", "assisted_living_facility", "retirement_home", "hospice"], osm: [], google: ["home health care agency"] },
  { key: "veterinarian", label: "Veterinarians", group: "Health", ticket: "mid", overture: ["veterinarian"], osm: [["amenity", "veterinary"]], google: ["veterinarian"] },

  // ── Professional ──
  { key: "lawyer", label: "Law firms", group: "Professional", ticket: "high", overture: ["attorney_or_law_firm", "personal_injury_law", "divorce_and_family_law", "criminal_defense_law", "bankruptcy_law", "wills_trusts_and_probate", "legal_service"], osm: [["office", "lawyer"]], google: ["law firm", "personal injury lawyer"] },
  { key: "accountant", label: "Accountants & tax", group: "Professional", ticket: "mid", overture: ["accountant", "tax_service"], osm: [["office", "accountant"], ["office", "tax_advisor"]], google: ["accountant", "tax preparation"] },
  { key: "financial_advisor", label: "Financial advisors", group: "Professional", ticket: "high", overture: ["financial_advising", "investing", "investment_management_company"], osm: [["office", "financial_advisor"]], google: ["financial advisor"] },
  { key: "insurance", label: "Insurance agencies", group: "Professional", ticket: "mid", overture: ["insurance_agency", "auto_insurance", "life_insurance"], osm: [["office", "insurance"]], google: ["insurance agency"] },
  { key: "mortgage", label: "Mortgage brokers", group: "Professional", ticket: "high", overture: ["mortgage_broker", "mortgage_lender"], osm: [], google: ["mortgage broker"] },
  { key: "real_estate", label: "Real estate", group: "Professional", ticket: "high", overture: ["real_estate_agent", "real_estate_service", "commercial_real_estate", "property_management"], osm: [["office", "estate_agent"]], google: ["real estate agent", "property management company"] },
  { key: "architect", label: "Architects & interior design", group: "Professional", ticket: "high", overture: ["architect", "architectural_designer", "interior_design"], osm: [["office", "architect"]], google: ["architect", "interior designer"] },
  { key: "staffing", label: "Staffing agencies", group: "Professional", ticket: "mid", overture: ["employment_agency"], osm: [["office", "employment_agency"]], google: ["staffing agency"] },

  // ── Home services (high value jobs) ──
  { key: "roofing", label: "Roofing", group: "Home services", ticket: "high", overture: ["roofing"], osm: [["craft", "roofer"]], google: ["roofing contractor"] },
  { key: "hvac", label: "HVAC", group: "Home services", ticket: "high", overture: ["hvac_service"], osm: [["craft", "hvac"]], google: ["HVAC contractor"] },
  { key: "plumbing", label: "Plumbing", group: "Home services", ticket: "high", overture: ["plumbing"], osm: [["craft", "plumber"]], google: ["plumber"] },
  { key: "electrician", label: "Electricians", group: "Home services", ticket: "high", overture: ["electrician"], osm: [["craft", "electrician"]], google: ["electrician"] },
  { key: "remodeling", label: "Contractors & remodeling", group: "Home services", ticket: "high", overture: ["contractor", "building_or_construction_service", "home_developer", "countertop_installation", "windows_installation", "insulation_installation"], osm: [["craft", "builder"], ["office", "construction_company"]], google: ["remodeling contractor", "general contractor"] },
  { key: "solar", label: "Solar installers", group: "Home services", ticket: "high", overture: ["solar_installation", "solar_energy_equipment_supplier"], osm: [["craft", "solar_installer"]], google: ["solar installer"] },
  { key: "restoration", label: "Water & fire restoration", group: "Home services", ticket: "high", overture: ["damage_restoration", "fire_and_water_damage_restoration"], osm: [], google: ["water damage restoration"] },
  { key: "pool", label: "Pool builders & service", group: "Home services", ticket: "high", overture: ["pool_cleaning", "pool_and_hot_tub_service"], osm: [], google: ["pool service", "pool builder"] },
  { key: "landscaping", label: "Landscaping & tree", group: "Home services", ticket: "mid", overture: ["landscaping", "lawn_service", "gardener", "tree_service"], osm: [["craft", "gardener"]], google: ["landscaping company", "tree service"] },
  { key: "pest_control", label: "Pest control", group: "Home services", ticket: "mid", overture: ["pest_control_service"], osm: [["craft", "pest_control"]], google: ["pest control"] },
  { key: "garage_door", label: "Garage doors", group: "Home services", ticket: "mid", overture: ["garage_door_service"], osm: [], google: ["garage door repair"] },
  { key: "fencing", label: "Fencing", group: "Home services", ticket: "mid", overture: ["fence_and_gate_sales_service"], osm: [], google: ["fence company"] },
  { key: "concrete", label: "Concrete & masonry", group: "Home services", ticket: "mid", overture: ["masonry_concrete"], osm: [["craft", "stonemason"]], google: ["concrete contractor"] },
  { key: "flooring", label: "Flooring", group: "Home services", ticket: "mid", overture: ["flooring_contractor", "flooring_store"], osm: [["shop", "flooring"]], google: ["flooring contractor"] },
  { key: "painting", label: "Painters", group: "Home services", ticket: "mid", overture: ["painting"], osm: [["craft", "painter"]], google: ["house painter"] },
  { key: "moving", label: "Movers", group: "Home services", ticket: "mid", overture: ["mover"], osm: [["office", "moving_company"]], google: ["moving company"] },
  { key: "cleaning", label: "Cleaning services", group: "Home services", ticket: "low", overture: ["home_cleaning", "cleaning_service", "janitorial_service", "carpet_cleaning"], osm: [["craft", "cleaning"]], google: ["cleaning service"] },
  { key: "locksmith", label: "Locksmiths", group: "Home services", ticket: "low", overture: ["key_and_locksmith"], osm: [["craft", "locksmith"], ["shop", "locksmith"]], google: ["locksmith"] },

  // ── Auto ──
  { key: "auto_dealer", label: "Car & RV dealers", group: "Auto", ticket: "high", overture: ["auto_dealer", "used_auto_dealer", "motorcycle_dealer", "recreational_vehicle_dealer"], osm: [["shop", "car"]], google: ["used car dealer"] },
  { key: "auto_repair", label: "Auto repair & body", group: "Auto", ticket: "mid", overture: ["automotive_repair", "auto_body_shop", "tire_dealer_and_repair", "auto_glass_service", "truck_repair"], osm: [["shop", "car_repair"], ["shop", "tyres"]], google: ["auto repair shop"] },
  { key: "auto_detailing", label: "Detailing & tint", group: "Auto", ticket: "low", overture: ["auto_detailing", "car_window_tinting", "auto_customization"], osm: [], google: ["auto detailing"] },
  { key: "towing", label: "Towing & trucking", group: "Auto", ticket: "mid", overture: ["towing_service", "freight_and_cargo_service", "motor_freight_trucking"], osm: [], google: ["towing service"] },

  // ── Beauty & fitness ──
  { key: "salon", label: "Hair salons & barbers", group: "Beauty & fitness", ticket: "low", overture: ["hair_salon", "barber", "beauty_salon"], osm: [["shop", "hairdresser"]], google: ["hair salon"] },
  { key: "spa", label: "Spas, nails & massage", group: "Beauty & fitness", ticket: "low", overture: ["spa", "day_spa", "nail_salon", "massage_therapy", "waxing", "tanning_salon", "skin_care_and_makeup"], osm: [["shop", "beauty"], ["shop", "massage"]], google: ["day spa"] },
  { key: "tattoo", label: "Tattoo studios", group: "Beauty & fitness", ticket: "low", overture: ["tattoo_and_piercing"], osm: [["shop", "tattoo"]], google: ["tattoo shop"] },
  { key: "gym", label: "Gyms, yoga & martial arts", group: "Beauty & fitness", ticket: "mid", overture: ["gym", "fitness_trainer", "yoga_studio", "martial_arts_club", "dance_studio", "gymnastics_center"], osm: [["leisure", "fitness_centre"], ["sport", "yoga"]], google: ["gym", "martial arts school"] },

  // ── Food, retail & events ──
  { key: "restaurant", label: "Restaurants", group: "Food, retail & events", ticket: "low", overture: ["restaurant", "mexican_restaurant", "pizza_restaurant", "american_restaurant", "barbecue_restaurant", "steakhouse", "italian_restaurant", "sushi_restaurant", "seafood_restaurant", "mediterranean_restaurant", "japanese_restaurant", "breakfast_and_brunch_restaurant", "bar_and_grill_restaurant"], osm: [["amenity", "restaurant"]], google: ["restaurant"] },
  { key: "cafe", label: "Cafés & bakeries", group: "Food, retail & events", ticket: "low", overture: ["coffee_shop", "cafe", "bakery", "dessert_shop", "ice_cream_shop"], osm: [["amenity", "cafe"], ["shop", "bakery"]], google: ["bakery"] },
  { key: "events", label: "Catering, venues & event pros", group: "Food, retail & events", ticket: "mid", overture: ["caterer", "party_and_event_planning", "event_photography_service", "event_venue"], osm: [], google: ["wedding venue", "caterer"] },
  { key: "boutique", label: "Boutiques & jewelry", group: "Food, retail & events", ticket: "mid", overture: ["fashion_boutique", "womens_clothing_store", "jewelry_store", "bridal_shop"], osm: [["shop", "boutique"], ["shop", "jewelry"]], google: ["boutique"] },
  { key: "furniture", label: "Furniture & home stores", group: "Food, retail & events", ticket: "mid", overture: ["furniture_store", "mattress_store", "home_goods_store", "appliance_store"], osm: [["shop", "furniture"]], google: ["furniture store"] },
  { key: "florist", label: "Florists", group: "Food, retail & events", ticket: "low", overture: ["florist", "flowers_and_gifts_store"], osm: [["shop", "florist"]], google: ["florist"] },
  { key: "pet", label: "Pet grooming & stores", group: "Food, retail & events", ticket: "low", overture: ["pet_groomer", "pet_store"], osm: [["shop", "pet"], ["shop", "pet_grooming"]], google: ["pet grooming"] },
  { key: "childcare", label: "Daycare & preschool", group: "Food, retail & events", ticket: "mid", overture: ["day_care_preschool", "child_care_and_day_care", "preschool"], osm: [["amenity", "childcare"], ["amenity", "kindergarten"]], google: ["daycare"] },
  { key: "hotel", label: "Hotels & B&Bs", group: "Food, retail & events", ticket: "mid", overture: ["hotel", "motel", "bed_and_breakfast"], osm: [["tourism", "hotel"], ["tourism", "motel"]], google: ["boutique hotel"] },
  { key: "funeral", label: "Funeral homes", group: "Food, retail & events", ticket: "high", overture: ["funeral_service"], osm: [["shop", "funeral_directors"]], google: ["funeral home"] },

  // ── B2B ──
  { key: "manufacturing", label: "Manufacturers & machine shops", group: "B2B", ticket: "high", overture: ["manufacturer", "industrial_equipment_manufacturer", "machine_shop", "metal_fabricator"], osm: [["craft", "metal_construction"]], google: ["machine shop", "metal fabrication"] },
  { key: "it_services", label: "IT & computer repair", group: "B2B", ticket: "mid", overture: ["it_service_and_computer_repair"], osm: [["shop", "computer"]], google: ["IT services company"] },
  { key: "printing", label: "Print & sign shops", group: "B2B", ticket: "mid", overture: ["printing_service", "sign_making", "t_shirt_printing_service"], osm: [["shop", "copyshop"], ["craft", "signmaker"]], google: ["sign shop"] },
];

export const NICHE_GROUPS = [...new Set(NICHES.map((n) => n.group))];
export const nicheByKey = new Map(NICHES.map((n) => [n.key, n]));
export const nicheLabel = (key: string | null | undefined) => (key ? (nicheByKey.get(key)?.label ?? key) : "—");

/** Overture taxonomy id → niche key. */
export const OVERTURE_TO_NICHE = new Map(NICHES.flatMap((n) => n.overture.map((c) => [c, n.key] as const)));
