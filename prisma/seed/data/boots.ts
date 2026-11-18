import type { BoardBootSeed, SkiBootSeed } from "../types";

/** Seed data: specs unverified, review scores are placeholders.
 *  Snowboard boot sizes are stored as US MEN'S equivalents
 *  (women's US ≈ men's + 1.5), matching the engine's input. */

const MENS_MONDO: [number, number] = [24.5, 32.5];
const WOMENS_MONDO: [number, number] = [22, 27.5];

export const SKI_BOOTS: SkiBootSeed[] = [
  {
    brand: "head", model: "Edge Lyt 80", modelYear: 2025, msrp: 400, ability: ["BEGINNER", "INTERMEDIATE"],
    flex: 80, lastWidthMm: 102, soleNorm: "GRIPWALK", mondo: MENS_MONDO, hasWalkMode: false,
    overview: "A roomy, forgiving boot that keeps new skiers comfortable while they find their edges.",
    review: { score: 80, pros: ["Roomy and comfortable", "Easy to put on"], cons: ["Soft as you progress"] },
  },
  {
    brand: "head", model: "Edge Lyt 75 W", modelYear: 2025, msrp: 380, womens: true, ability: ["BEGINNER", "INTERMEDIATE"],
    flex: 75, lastWidthMm: 102, soleNorm: "GRIPWALK", mondo: WOMENS_MONDO,
    overview: "A women's comfort boot with a soft, forgiving flex and a warm, generous fit.",
    review: { score: 79, pros: ["Warm and comfortable", "Forgiving"], cons: ["Limited support at speed"] },
  },
  {
    brand: "lange", model: "LX 90", modelYear: 2025, msrp: 450, ability: ["BEGINNER", "INTERMEDIATE"],
    flex: 90, lastWidthMm: 102, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "Comfort-first fit with enough support for intermediates who are starting to push the pace.",
    review: { score: 81, pros: ["Comfortable wide fit", "Good progression boot"], cons: ["Loose for narrow feet"] },
  },
  {
    brand: "nordica", model: "Speedmachine 3 110", modelYear: 2025, msrp: 650, ability: ["INTERMEDIATE", "ADVANCED"],
    flex: 110, lastWidthMm: 100, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "A medium-volume all-mountain boot with a comfortable liner and a supportive, progressive flex.",
    review: { score: 85, pros: ["Comfortable out of the box", "Progressive flex"], cons: ["Liner packs out"] },
  },
  {
    brand: "nordica", model: "Speedmachine 3 95 W", modelYear: 2025, msrp: 600, womens: true, ability: ["INTERMEDIATE", "ADVANCED"],
    flex: 95, lastWidthMm: 100, soleNorm: "GRIPWALK", mondo: WOMENS_MONDO,
    overview: "A women's all-mountain boot that pairs a warm, cushy fit with solid support for confident skiing.",
    review: { score: 85, pros: ["Warm, cushy liner", "Supportive"], cons: ["Bulky shell"] },
  },
  {
    brand: "tecnica", model: "Mach1 MV 105 W", modelYear: 2025, msrp: 700, womens: true, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 105, lastWidthMm: 100, soleNorm: "GRIPWALK", mondo: WOMENS_MONDO,
    overview: "A precise, anatomically shaped women's boot that supports strong skiing without crushing toes.",
    review: { score: 89, pros: ["Excellent anatomical fit", "Precise"], cons: ["Snug for wide forefeet"] },
  },
  {
    brand: "tecnica", model: "Mach1 MV 120", modelYear: 2025, msrp: 800, ability: ["ADVANCED", "EXPERT"], popular: true,
    flex: 120, lastWidthMm: 100, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "A benchmark medium-volume performance boot with a precise heel hold and lots of room to customize.",
    review: { score: 90, pros: ["Precise, locked heel", "Very customizable"], cons: ["Tough to put on cold"] },
  },
  {
    brand: "tecnica", model: "Mach1 LV 130", modelYear: 2025, msrp: 900, ability: ["ADVANCED", "EXPERT"],
    flex: 130, lastWidthMm: 98, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "A low-volume, stiff boot for narrow feet and strong skiers who want direct, race-like response.",
    review: { score: 89, pros: ["Very direct response", "Snug performance fit"], cons: ["Too narrow for many feet"] },
  },
  {
    brand: "tecnica", model: "Cochise 120 DYN", modelYear: 2025, msrp: 850, ability: ["ADVANCED", "EXPERT"],
    flex: 120, lastWidthMm: 99, soleNorm: "GRIPWALK", mondo: MENS_MONDO, hasWalkMode: true,
    overview: "A freeride boot with a real walk mode and tech inserts, so it handles both resort laps and short tours.",
    review: { score: 87, pros: ["Real walk mode", "Skis like an alpine boot"], cons: ["Heavier than pure touring boots"] },
  },
  {
    brand: "lange", model: "Shadow 130 MV", modelYear: 2025, msrp: 950, ability: ["ADVANCED", "EXPERT"], popular: true,
    flex: 130, lastWidthMm: 100, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "Powerful and smooth, with a design that lets the ankle flex naturally while staying stiff laterally.",
    review: { score: 90, pros: ["Smooth, natural flex", "Powerful"], cons: ["Expensive"] },
  },
  {
    brand: "atomic", model: "Hawx Prime 120 S", modelYear: 2025, msrp: 800, ability: ["ADVANCED", "EXPERT"],
    flex: 120, lastWidthMm: 100, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "A medium-volume boot with a fully heat-moldable shell, so a shop can fine-tune the fit.",
    review: { score: 87, pros: ["Moldable shell", "Light for its class"], cons: ["Thin liner"] },
  },
  {
    brand: "atomic", model: "Hawx Ultra 130 S", modelYear: 2025, msrp: 900, ability: ["ADVANCED", "EXPERT"],
    flex: 130, lastWidthMm: 98, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "A light, low-volume, stiff boot for precise skiers with narrow feet.",
    review: { score: 86, pros: ["Light and precise", "Moldable shell"], cons: ["Tight for average feet"] },
  },
  {
    brand: "salomon", model: "S/Pro Supra BOA 120", modelYear: 2025, msrp: 850, ability: ["ADVANCED", "EXPERT"],
    flex: 120, lastWidthMm: 100, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "A BOA dial wraps the shell evenly around the foot for a precise fit without buckle pressure points.",
    review: { score: 86, pros: ["Even BOA wrap", "Quick to adjust"], cons: ["BOA repair is harder in the field"] },
  },
  {
    brand: "dalbello", model: "Panterra 120 GW", modelYear: 2025, msrp: 750, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 120, lastWidthMm: 102, soleNorm: "GRIPWALK", mondo: MENS_MONDO,
    overview: "A higher-volume performance boot for wider feet, with an easy-entry design and a supportive flex.",
    review: { score: 84, pros: ["Fits wider feet", "Easy entry"], cons: ["Loose for narrow heels"] },
  },
];

const MENS_US: [number, number] = [7, 14];
const WOMENS_US: [number, number] = [3.5, 9.5];

export const SNOWBOARD_BOOTS: BoardBootSeed[] = [
  {
    brand: "burton", model: "Moto BOA", modelYear: 2025, msrp: 230, ability: ["BEGINNER", "INTERMEDIATE"],
    flex: 3, lacing: "SINGLE_BOA", usSize: MENS_US, wideAvailable: true,
    overview: "A soft, comfortable, easy-to-adjust boot that makes first days on snow a lot less painful.",
    review: { score: 80, pros: ["Comfortable right away", "Easy dial"], cons: ["Too soft as you progress"] },
  },
  {
    brand: "burton", model: "Ruler BOA", modelYear: 2025, msrp: 300, ability: ["BEGINNER", "ADVANCED"], popular: true,
    flex: 5, lacing: "SINGLE_BOA", usSize: MENS_US, wideAvailable: true, reducedFootprint: true,
    overview: "A medium-flex all-mountain boot with a trim footprint that keeps your toes from dragging.",
    review: { score: 86, pros: ["Versatile flex", "Low-profile footprint"], cons: ["Single dial limits fine-tuning"] },
  },
  {
    brand: "burton", model: "Photon BOA", modelYear: 2025, msrp: 400, ability: ["INTERMEDIATE", "EXPERT"], popular: true,
    flex: 7, lacing: "DOUBLE_BOA", usSize: MENS_US, wideAvailable: true, reducedFootprint: true,
    overview: "A supportive, responsive boot for carving and freeriding, with two dials for an exact fit.",
    review: { score: 89, pros: ["Responsive and supportive", "Precise two-zone fit"], cons: ["Stiff for park"] },
  },
  {
    brand: "burton", model: "Photon Step On", modelYear: 2025, msrp: 500, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 7, lacing: "DOUBLE_BOA", usSize: MENS_US, wideAvailable: true, stepOnSystem: "Burton Step On", reducedFootprint: true,
    overview: "The supportive Photon built for Step On bindings, for strapless entry with a performance flex.",
    review: { score: 86, pros: ["Strapless convenience", "Supportive"], cons: ["Locked to Step On bindings"] },
  },
  {
    brand: "burton", model: "Felix BOA", modelYear: 2025, msrp: 380, womens: true, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 5, lacing: "DOUBLE_BOA", usSize: WOMENS_US,
    overview: "A women's all-mountain boot with a balanced flex and two dials that dial in heel hold.",
    review: { score: 87, pros: ["Great heel hold", "Comfortable liner"], cons: ["Pricier"] },
  },
  {
    brand: "thirtytwo", model: "Lashed", modelYear: 2025, msrp: 250, ability: ["BEGINNER", "ADVANCED"],
    flex: 5, lacing: "TRADITIONAL", usSize: MENS_US, wideAvailable: true,
    overview: "A traditional-lace classic with a mid flex that breaks in to a comfortable, personal fit.",
    review: { score: 85, pros: ["Classic laced fit", "Durable"], cons: ["Laces take longer"] },
  },
  {
    brand: "thirtytwo", model: "TM-2 Double BOA", modelYear: 2025, msrp: 380, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 7, lacing: "DOUBLE_BOA", usSize: MENS_US, wideAvailable: true,
    overview: "A pro-level all-mountain boot that stays supportive through long days of hard riding.",
    review: { score: 88, pros: ["Holds stiffness well", "Precise fit"], cons: ["Break-in period"] },
  },
  {
    brand: "thirtytwo", model: "STW Double BOA W", modelYear: 2025, msrp: 370, womens: true, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 6, lacing: "DOUBLE_BOA", usSize: WOMENS_US,
    overview: "A supportive women's boot made for freeride and all-mountain riders who want a responsive feel.",
    review: { score: 86, pros: ["Supportive", "Precise dual-zone fit"], cons: ["Firm for beginners"] },
  },
  {
    brand: "vans", model: "Hi-Standard Pro", modelYear: 2025, msrp: 300, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 5, lacing: "TRADITIONAL", usSize: MENS_US,
    overview: "A skate-inspired laced boot with a mid flex and great board feel for park and street-style riding.",
    review: { score: 86, pros: ["Great board feel", "Comfortable"], cons: ["Soft for big-mountain riding"] },
  },
  {
    brand: "vans", model: "Infuse", modelYear: 2025, msrp: 450, ability: ["ADVANCED", "EXPERT"],
    flex: 8, lacing: "DOUBLE_BOA", usSize: MENS_US,
    overview: "A stiff, high-performance boot for freeriders who need support at speed and in big terrain.",
    review: { score: 87, pros: ["Very supportive", "Good heel hold"], cons: ["Stiff for park"] },
  },
  {
    brand: "k2", model: "Maysis", modelYear: 2025, msrp: 400, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 6, lacing: "DOUBLE_BOA", usSize: MENS_US, wideAvailable: true,
    overview: "A dependable all-mountain boot with a medium-stiff flex and two-zone fit adjustment.",
    review: { score: 86, pros: ["Reliable all-rounder", "Easy two-zone adjust"], cons: ["Runs a bit roomy"] },
  },
  {
    brand: "dc", model: "Judge BOA", modelYear: 2025, msrp: 380, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 7, lacing: "DOUBLE_BOA", usSize: MENS_US,
    overview: "A supportive freeride-oriented boot with a stiffer flex and a locked-in heel.",
    review: { score: 84, pros: ["Supportive", "Good heel hold"], cons: ["Bulky footprint"] },
  },
  {
    brand: "salomon", model: "Dialogue Dual BOA", modelYear: 2025, msrp: 380, ability: ["INTERMEDIATE", "EXPERT"],
    flex: 6, lacing: "DOUBLE_BOA", usSize: MENS_US, wideAvailable: true,
    overview: "An all-mountain boot that's comfortable from the first day and supportive enough for the whole hill.",
    review: { score: 85, pros: ["Comfortable from day one", "Versatile"], cons: ["Liner packs out"] },
  },
];
