/** Concept campaigns for fictional brands — art-directed by us, produced with AI-assisted imaging. */

export type ShotFormat = "16:9" | "4:5" | "1:1";
export type Shot = { src: string; format: ShotFormat; kind: string; alt: string };
export type Campaign = {
  slug: string;
  brand: string;
  title: string;
  industry: string;
  story: string;
  accent: string;
  shots: Shot[];
  reel: string;
  reelPoster: string;
};

const KINDS = ["Cover & hero", "Commercial ad", "Lifestyle", "Social post", "Detail study"];
const FORMATS: ShotFormat[] = ["16:9", "4:5", "4:5", "1:1", "4:5"];

function campaign(
  slug: string,
  brand: string,
  title: string,
  industry: string,
  accent: string,
  story: string,
  alts: string[],
): Campaign {
  return {
    slug,
    brand,
    title,
    industry,
    accent,
    story,
    shots: alts.map((alt, i) => ({ src: `/work/${slug}/0${i + 1}.webp`, format: FORMATS[i], kind: KINDS[i], alt })),
    reel: `/work/${slug}/reel.mp4`,
    reelPoster: `/work/${slug}/reel-poster.webp`,
  };
}

export const CAMPAIGNS: Campaign[] = [
  campaign("vellum-moss", "Vellum Moss", "The Last Light", "Beauty & skincare", "#c9a24a",
    "A cleansing balm followed through the last minutes of daylight — olive glass catching the sun, balm melting on skin.",
    [
      "Olive glass jar of Vellum Moss cleansing balm on wet slate in a band of amber light",
      "Open jar on ivory paper with the headline ‘Take the day off.’",
      "Woman at a tiled bathroom mirror massaging balm onto her cheek at dusk",
      "Overhead jar casting a sundial shadow onto the words ‘Clock out.’",
      "Macro of a curl of honey-coloured balm on an ivory spatula",
    ]),
  campaign("ember-fold", "Ember Fold", "At the Pass", "Restaurants & food", "#b33a3a",
    "A Chicago supper club follows one ricotta-filled pasta parcel from the flour bench to the last table of the night.",
    [
      "Plate of folded ricotta pasta sliding through a kitchen pass under warm lamps",
      "Overhead plate on an oxblood tablecloth with the headline ‘Dinner is folded.’",
      "Diner at a walnut booth at night cutting a pasta parcel by candlelight",
      "Red reservation slip reading ‘Save a seat.’ beside a silver fork",
      "Flour-covered hands folding a raw pasta parcel on a pastry bench",
    ]),
  campaign("line-parish", "Line Parish", "Crosswind", "Fashion & apparel", "#e0a526",
    "A saffron commuter coat cuts a bright line through grey ferry architecture on a windy morning crossing.",
    [
      "Woman in a saffron raincoat on an open ferry deck, wind pulling the hem",
      "Studio portrait in the saffron coat with the title ‘Cut for crosswinds.’",
      "Model by a fogged ferry window holding a folded newspaper",
      "Folded coat on a ferry bench with an ‘OUTBOUND’ ticket in the pocket",
      "Macro of a waxed cotton collar with water beads and saddle stitching",
    ]),
  campaign("nock-vale", "Nock Vale", "A Better Angle", "E-commerce products", "#e2552d",
    "A task lamp for small workspaces becomes both the subject of the campaign and the light for a late-night drawing session.",
    [
      "Vermilion task lamp glowing at blue dusk over a sharpened pencil",
      "Side profile of the red lamp on powder blue with the headline ‘A better angle.’",
      "Illustrator inking an architectural drawing under the lamp at night",
      "Lamp casting a warm ellipse on blue paper with the words ‘Spot on.’",
      "Finger about to press the black rocker switch on the vermilion base",
    ]),
  campaign("sill-house", "Sill House", "Between Two Pines", "Real estate", "#8a9a6b",
    "A Pacific Northwest residence introduced through its long cedar roofline, shaded passage and tree-framed courtyard.",
    [
      "Long cedar house at twilight framed by two pine trees",
      "Cedar passage to a courtyard with the headline ‘Room for stillness.’",
      "Person setting two coffee cups on an oak table by a glass wall",
      "Architectural maquette of the house on a drafting desk labelled ‘SILL HOUSE’",
    ]),
  campaign("turn-count", "Turn Count", "Between Rounds", "Fitness & wellness", "#d8452f",
    "A jump-rope studio campaign that uses the red sweep of a speed rope and the stillness between sets to give training a rhythm.",
    [
      "Athlete mid-skip with a red speed rope in one clear arc in a green gym",
      "Red speed rope and black handles with the headline ‘Find your count.’",
      "Boxer resting on a green bench holding the rope handles after a round",
      "Red rope shaped into the number 8 with the words ‘ONE MORE ROUND’",
    ]),
  campaign("orrel-hour", "Orrel Hour", "The Blue Minute", "Jewelry & watches", "#3557c8",
    "A cobalt-dial dress watch catches the stage light on a lacquered piano, then again on a pianist’s wrist before the show.",
    [
      "Cobalt-dial dress watch on the edge of a black lacquer grand piano under a spotlight",
      "Watch face suspended on a navy strap with the headline ‘A quieter hour.’",
      "Pianist’s wrist adjusting a black cuff backstage, watch in sharp focus",
      "Watch coiled around a concert ticket with a conductor’s baton and the word ‘Prelude.’",
    ]),
  campaign("folio-relay", "Folio Relay", "The Next Proof", "Technology & SaaS", "#ef7d22",
    "A proofing tool for print studios connects paper, screen and the decision that sends a design to press.",
    [
      "Print studio monitor showing the Folio Relay review screen beside the printed proof",
      "Screen with an indigo book proof and orange note, headline ‘Close the proof loop.’",
      "Designer comparing a paper proof against a calibrated display",
      "Indigo proof on a white table with an orange sticky note reading ‘Approved.’",
    ]),
];

export const SHOWREEL = { src: "/work/showreel.mp4", poster: "/work/showreel-poster.webp" };

export const ASPECT: Record<ShotFormat, string> = { "16:9": "aspect-[16/9]", "4:5": "aspect-[4/5]", "1:1": "aspect-square" };
