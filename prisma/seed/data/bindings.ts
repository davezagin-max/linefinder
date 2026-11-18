import type { BoardBindingSeed, SkiBindingSeed } from "../types";

/** Seed data: specs unverified, review scores are placeholders. */

const ALPINE_GW = ["ALPINE_ISO5355", "GRIPWALK"] as SkiBindingSeed["soleCompat"];
const MULTI_NORM = ["ALPINE_ISO5355", "GRIPWALK", "WTR", "TOURING_ISO9523"] as SkiBindingSeed["soleCompat"];

export const SKI_BINDINGS: SkiBindingSeed[] = [
  {
    brand: "marker", model: "Squire 11", modelYear: 2025, msrp: 230, ability: ["BEGINNER", "INTERMEDIATE"],
    type: "ALPINE", din: [3, 11], brakeWidthsMm: [90, 100, 110], soleCompat: MULTI_NORM, weightG: 1830,
    overview: "A light, budget-friendly alpine binding with easy step-in and plenty of release range for lighter and progressing skiers.",
    review: { score: 80, pros: ["Light for an alpine binding", "Fits most boot soles"], cons: ["Not for heavy, aggressive skiers"] },
  },
  {
    brand: "marker", model: "Griffon 13 ID", modelYear: 2025, msrp: 330, ability: ["INTERMEDIATE", "EXPERT"], popular: true,
    type: "ALPINE", din: [4, 13], brakeWidthsMm: [90, 100, 110, 120], soleCompat: MULTI_NORM, weightG: 2100,
    overview: "The do-it-all freeride binding: solid power transfer, wide brake options and multi-norm sole compatibility.",
    review: { score: 87, pros: ["Proven, reliable workhorse", "Wide brake selection"], cons: ["Taller stack than some rivals"] },
  },
  {
    brand: "marker", model: "Jester 16 ID", modelYear: 2025, msrp: 450, ability: ["ADVANCED", "EXPERT"],
    type: "ALPINE", din: [6, 16], brakeWidthsMm: [90, 110, 125], soleCompat: MULTI_NORM, weightG: 2240,
    overview: "A burly, high-DIN binding for heavier and harder-charging skiers who want dependable retention.",
    review: { score: 86, pros: ["Strong retention", "Durable build"], cons: ["Overkill for lighter skiers", "Heavier"] },
  },
  {
    brand: "marker", model: "Duke PT 16", modelYear: 2025, msrp: 800, ability: ["ADVANCED", "EXPERT"],
    type: "HYBRID_TOURING", din: [6, 16], brakeWidthsMm: [100, 125], soleCompat: ["ALPINE_ISO5355", "GRIPWALK", "TOURING_ISO9523", "TECH_INSERTS"], hasWalkMode: true, weightG: 1320,
    overview: "A hybrid that skis like a resort binding but converts to pin-toe touring when you want to earn some turns.",
    review: { score: 82, pros: ["Resort-level downhill power", "Pin uphill efficiency"], cons: ["Pricey", "Fiddly transitions"] },
  },
  {
    brand: "look", model: "SPX 12 GW", modelYear: 2025, msrp: 300, ability: ["INTERMEDIATE", "ADVANCED"],
    type: "ALPINE", din: [3.5, 12], brakeWidthsMm: [90, 100, 120], soleCompat: ALPINE_GW, weightG: 2100,
    overview: "A solid, smooth-releasing all-mountain binding with the trusted turntable-style feel at a friendlier price.",
    review: { score: 84, pros: ["Smooth, predictable release", "Good value"], cons: ["Limited brake widths"] },
  },
  {
    brand: "look", model: "Pivot 12 GW", modelYear: 2025, msrp: 380, ability: ["INTERMEDIATE", "EXPERT"],
    type: "ALPINE", din: [4, 12], brakeWidthsMm: [95, 115], soleCompat: ALPINE_GW, weightG: 2500,
    overview: "The turntable-heel Pivot in a lighter-skier DIN range, with lots of elastic travel to stay in through impacts.",
    review: { score: 89, pros: ["Excellent elastic travel", "Low profile feel"], cons: ["Heavy", "Higher price"] },
  },
  {
    brand: "look", model: "Pivot 15 GW", modelYear: 2025, msrp: 450, ability: ["ADVANCED", "EXPERT"], popular: true,
    type: "ALPINE", din: [6, 15], brakeWidthsMm: [95, 115, 130], soleCompat: ALPINE_GW, weightG: 2600,
    overview: "A favorite of freeride and park skiers: huge elastic travel and a turntable heel that holds through hard landings.",
    review: { score: 91, pros: ["Best-in-class retention", "Huge elastic travel"], cons: ["Heavy", "Not multi-norm"] },
  },
  {
    brand: "salomon", model: "Strive 14 GW", modelYear: 2025, msrp: 360, ability: ["INTERMEDIATE", "EXPERT"],
    type: "ALPINE", din: [5, 14], brakeWidthsMm: [90, 100, 115], soleCompat: ALPINE_GW, weightG: 2100,
    overview: "A modern alpine binding with a wide toe platform for stable power transfer and smooth release.",
    review: { score: 85, pros: ["Wide, stable toe platform", "Easy step-in"], cons: ["Not touring-sole compatible"] },
  },
  {
    brand: "salomon", model: "STH2 MNC 13", modelYear: 2025, msrp: 400, ability: ["ADVANCED", "EXPERT"],
    type: "ALPINE", din: [4, 13], brakeWidthsMm: [90, 100, 120], soleCompat: MULTI_NORM, weightG: 2240,
    overview: "A classic freeride binding with a roomy release range and compatibility with nearly every boot sole.",
    review: { score: 85, pros: ["Very durable", "Multi-norm compatible"], cons: ["Heavier than newer designs"] },
  },
  {
    brand: "salomon", model: "Shift2 MNC 13", modelYear: 2025, msrp: 650, ability: ["ADVANCED", "EXPERT"],
    type: "HYBRID_TOURING", din: [5, 13], brakeWidthsMm: [90, 100, 110, 120], soleCompat: ["ALPINE_ISO5355", "GRIPWALK", "WTR", "TOURING_ISO9523", "TECH_INSERTS"], hasWalkMode: true, weightG: 1730,
    overview: "An alpine-certified hybrid that switches to a pin toe for climbing, made for resort skiers who tour sometimes.",
    review: { score: 84, pros: ["Alpine-certified downhill", "Light for a hybrid"], cons: ["Expensive", "Toe can ice up"] },
  },
  {
    brand: "tyrolia", model: "Attack 14 GW", modelYear: 2025, msrp: 330, ability: ["INTERMEDIATE", "EXPERT"],
    type: "ALPINE", din: [5, 14], brakeWidthsMm: [95, 110, 130], soleCompat: ALPINE_GW, weightG: 2140,
    overview: "A dependable, mid-weight alpine binding with a low standing height and easy step-in.",
    review: { score: 82, pros: ["Low stack height", "Fair price"], cons: ["Fewer narrow brake options"] },
  },
  {
    brand: "atomic", model: "Warden MNC 11", modelYear: 2025, msrp: 250, ability: ["BEGINNER", "ADVANCED"],
    type: "ALPINE", din: [3.5, 11], brakeWidthsMm: [90, 100, 110], soleCompat: MULTI_NORM, weightG: 1950,
    overview: "A simple, affordable binding that fits almost any boot, ideal for lighter skiers and first setups.",
    review: { score: 79, pros: ["Fits almost any boot", "Affordable"], cons: ["Lower DIN ceiling"] },
  },
];

const BURTON_SIZES = [
  { label: "S", usMin: 4, usMax: 6 },
  { label: "M", usMin: 7, usMax: 10 },
  { label: "L", usMin: 10, usMax: 13 },
];
const UNION_SIZES = [
  { label: "S", usMin: 5, usMax: 7.5 },
  { label: "M", usMin: 8, usMax: 10.5 },
  { label: "L", usMin: 11, usMax: 14 },
];
const WOMENS_SIZES = [
  { label: "S", usMin: 3.5, usMax: 6 }, // men's-equivalent US sizes
  { label: "M", usMin: 6, usMax: 8.5 },
  { label: "L", usMin: 8.5, usMax: 10.5 },
];
const ALL_PATTERNS = ["FOUR_X_FOUR", "TWO_X_FOUR", "CHANNEL"] as BoardBindingSeed["mountCompat"];

export const SNOWBOARD_BINDINGS: BoardBindingSeed[] = [
  {
    brand: "union", model: "Flite Pro", modelYear: 2025, msrp: 180, ability: ["BEGINNER", "INTERMEDIATE"],
    flex: 3, responsiveness: 3, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: UNION_SIZES,
    overview: "A light, soft, forgiving binding that makes learning and cruising more comfortable.",
    review: { score: 80, pros: ["Light and comfy", "Forgiving flex"], cons: ["Too soft for charging"] },
  },
  {
    brand: "union", model: "Strata", modelYear: 2025, msrp: 300, ability: ["INTERMEDIATE", "EXPERT"], popular: true,
    flex: 6, responsiveness: 6, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: UNION_SIZES,
    overview: "A mid-flex all-mountain binding that balances park playfulness with enough support for the whole hill.",
    review: { score: 89, pros: ["Versatile mid flex", "Very durable"], cons: ["Straps take breaking in"] },
  },
  {
    brand: "union", model: "Force", modelYear: 2025, msrp: 280, ability: ["INTERMEDIATE", "EXPERT"], popular: true,
    flex: 7, responsiveness: 7, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: UNION_SIZES,
    overview: "A long-running all-mountain staple: supportive, responsive and famously hard to break.",
    review: { score: 90, pros: ["Bombproof durability", "Responsive"], cons: ["A bit heavy"] },
  },
  {
    brand: "union", model: "Atlas", modelYear: 2025, msrp: 330, ability: ["ADVANCED", "EXPERT"],
    flex: 7.5, responsiveness: 8, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: UNION_SIZES,
    overview: "A stiff, damp binding for fast freeriding and carving, with a cushioned base for big landings.",
    review: { score: 88, pros: ["Damp and powerful", "Great for carving"], cons: ["Stiff for park laps"] },
  },
  {
    brand: "union", model: "Juliet", modelYear: 2025, msrp: 250, womens: true, ability: ["BEGINNER", "ADVANCED"],
    flex: 5, responsiveness: 5, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: WOMENS_SIZES,
    overview: "A women's all-mountain binding with a medium flex that's comfortable all day and supportive enough to progress.",
    review: { score: 86, pros: ["Comfortable all day", "Easy to adjust"], cons: ["Not for very stiff boots"] },
  },
  {
    brand: "burton", model: "Mission Re:Flex", modelYear: 2025, msrp: 260, ability: ["BEGINNER", "ADVANCED"],
    flex: 5, responsiveness: 5, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: BURTON_SIZES,
    overview: "An easy-going, mid-flex binding that fits every mounting pattern and suits most riders.",
    review: { score: 83, pros: ["Fits any board", "Comfortable"], cons: ["Basic adjustment"] },
  },
  {
    brand: "burton", model: "Cartel Re:Flex", modelYear: 2025, msrp: 300, ability: ["INTERMEDIATE", "EXPERT"], popular: true,
    flex: 6, responsiveness: 7, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: BURTON_SIZES,
    overview: "Burton's responsive all-mountain binding, built for riders who carve hard and ride everything.",
    review: { score: 88, pros: ["Responsive edge to edge", "Excellent straps"], cons: ["Pricier than rivals"] },
  },
  {
    brand: "burton", model: "Malavita Re:Flex", modelYear: 2025, msrp: 280, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 4, responsiveness: 5, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: BURTON_SIZES,
    overview: "A softer, surfy-feeling binding with room to tweak, made for park and playful all-mountain riding.",
    review: { score: 86, pros: ["Tweakable, playful feel", "Comfortable"], cons: ["Soft for high speeds"] },
  },
  {
    brand: "burton", model: "Lexa Re:Flex", modelYear: 2025, msrp: 260, womens: true, ability: ["BEGINNER", "ADVANCED"],
    flex: 4, responsiveness: 5, entry: "STRAP", mountCompat: ALL_PATTERNS, sizeRanges: WOMENS_SIZES,
    overview: "A women's all-mountain binding with a forgiving but capable flex and easy, secure straps.",
    review: { score: 86, pros: ["Comfortable and secure", "Fits every pattern"], cons: ["Soft for aggressive riders"] },
  },
  {
    brand: "burton", model: "Step On Re:Flex", modelYear: 2025, msrp: 330, ability: ["BEGINNER", "EXPERT"], popular: true,
    flex: 6, responsiveness: 6, entry: "STEP_ON", stepOnSystem: "Burton Step On", mountCompat: ALL_PATTERNS, sizeRanges: BURTON_SIZES,
    overview: "Strapless step-in convenience: click in at the top of the lift without sitting down. Needs Step On boots.",
    review: { score: 85, pros: ["Fast, strapless entry", "Secure hold"], cons: ["Requires Step On boots"] },
  },
  {
    brand: "k2", model: "Clicker X HB", modelYear: 2025, msrp: 300, ability: ["BEGINNER", "ADVANCED"],
    flex: 5, responsiveness: 5, entry: "STEP_ON", stepOnSystem: "K2 Clicker X HB", mountCompat: ["FOUR_X_FOUR", "TWO_X_FOUR", "CHANNEL"], sizeRanges: UNION_SIZES,
    overview: "A step-in binding system with a supportive highback, made to pair with Clicker-compatible boots.",
    review: { score: 80, pros: ["Quick step-in", "Solid heel hold"], cons: ["Needs Clicker boots"] },
  },
  {
    brand: "rome", model: "Katana", modelYear: 2025, msrp: 330, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 6, responsiveness: 7, entry: "STRAP", mountCompat: ["FOUR_X_FOUR", "TWO_X_FOUR", "CHANNEL"], sizeRanges: UNION_SIZES,
    overview: "A responsive all-mountain binding with a canted footbed and quick toe-to-heel power.",
    review: { score: 84, pros: ["Quick response", "Comfortable canted footbed"], cons: ["Setup takes fiddling"] },
  },
];
