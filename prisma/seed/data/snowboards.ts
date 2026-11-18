import type { BoardSeed, BoardSizeSeed } from "../types";

/**
 * Seed snowboards. Specs are best-effort and stored as "seed:unverified"
 * until checked against manufacturer spec sheets. Review scores are
 * PLACEHOLDERS. Manufacturer rider-weight ranges are deliberately omitted
 * until verified; the engine falls back to its weight/height formula.
 * modelYear 2025 = the 2025/26 season.
 */

/** Regular size: [length, waist mm]. */
const reg = (sizes: [number, number][]): BoardSizeSeed[] =>
  sizes.map(([lengthCm, waist]) => ({ label: String(lengthCm), lengthCm, waist }));
/** Wide size: [length, waist mm] → label "158W". */
const wide = (sizes: [number, number][]): BoardSizeSeed[] =>
  sizes.map(([lengthCm, waist]) => ({ label: `${lengthCm}W`, lengthCm, waist, wide: true }));

export const SNOWBOARDS: BoardSeed[] = [
  // ───────────── All-mountain ─────────────
  {
    brand: "burton", model: "Custom Camber", modelYear: 2025, lineageKey: "burton-custom", msrp: 630, popular: true,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "CAMBER", shape: "DIRECTIONAL_TWIN", flex: 6,
    core: "Super Fly II wood", laminate: "CARBON_FIBERGLASS", setbackMm: 12, taperMm: 0, insertPattern: "CHANNEL", baseType: "sintered",
    sizes: [...reg([[154, 250], [156, 251], [158, 252], [160, 254], [162, 256]]), ...wide([[158, 260], [162, 264]])],
    overview: "The long-running all-mountain benchmark: poppy camber, a stable ride and versatility everywhere.",
    review: { score: 88, pros: ["Does everything well", "Poppy and stable"], cons: ["Camber catches edges for beginners"] },
  },
  {
    brand: "burton", model: "Process Flying V", modelYear: 2025, lineageKey: "burton-process", msrp: 580, popular: true,
    ability: ["BEGINNER", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_ROCKER", shape: "TRUE_TWIN", flex: 5,
    core: "Super Fly II wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "CHANNEL", baseType: "sintered",
    sizes: [...reg([[152, 248], [155, 250], [157, 251], [159, 253], [162, 256]]), ...wide([[157, 259], [162, 263]])],
    overview: "A playful, forgiving twin that floats in soft snow and makes the whole mountain feel like a park.",
    review: { score: 86, pros: ["Playful and forgiving", "Floats well"], cons: ["Loose at high speed"] },
  },
  {
    brand: "burton", model: "Instigator Flat Top", modelYear: 2025, msrp: 400,
    ability: ["BEGINNER", "INTERMEDIATE"], category: "ALL_MOUNTAIN", profile: "FLAT_ROCKER", shape: "DIRECTIONAL", flex: 3,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 12, taperMm: 0, insertPattern: "CHANNEL", baseType: "extruded",
    sizes: [...reg([[145, 243], [150, 246], [155, 250], [160, 254]]), ...wide([[160, 260]])],
    overview: "A soft, catch-free beginner board that makes learning to link turns much less painful.",
    review: { score: 81, pros: ["Very hard to catch an edge", "Affordable"], cons: ["Outgrown quickly"] },
  },
  {
    brand: "burton", model: "Feelgood Camber", modelYear: 2025, womens: true, msrp: 600,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "CAMBER", shape: "DIRECTIONAL_TWIN", flex: 6,
    core: "Super Fly II wood", laminate: "CARBON_FIBERGLASS", setbackMm: 10, taperMm: 0, insertPattern: "CHANNEL", baseType: "sintered",
    sizes: reg([[142, 234], [146, 237], [149, 239], [152, 241], [155, 244]]),
    overview: "A women's all-mountain camber board with lively pop and confident edge hold.",
    review: { score: 86, pros: ["Lively and precise", "Great edge hold"], cons: ["Less forgiving than rocker"] },
  },
  {
    brand: "burton", model: "Yeasayer Flat Top", modelYear: 2025, womens: true, msrp: 430,
    ability: ["BEGINNER", "INTERMEDIATE"], category: "ALL_MOUNTAIN", profile: "FLAT_ROCKER", shape: "TRUE_TWIN", flex: 4,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "CHANNEL", baseType: "extruded",
    sizes: reg([[138, 232], [142, 234], [146, 236], [149, 238], [152, 240]]),
    overview: "A women's soft, playful twin that's easy to learn on and fun for first park laps.",
    review: { score: 81, pros: ["Easy and forgiving", "Playful"], cons: ["Soft at speed"] },
  },
  {
    brand: "jones", model: "Mountain Twin", modelYear: 2025, lineageKey: "jones-mountain-twin", msrp: 550, popular: true,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL_TWIN", flex: 6,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 12, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[151, 249], [154, 252], [157, 255], [160, 258]]), ...wide([[157, 262], [160, 265], [163, 268]])],
    overview: "A versatile directional twin that charges groomers, lands jumps and handles powder days.",
    review: { score: 88, pros: ["Versatile everywhere", "Strong edge hold"], cons: ["Stiffer for park"] },
  },
  {
    brand: "jones", model: "Frontier", modelYear: 2025, lineageKey: "jones-frontier", msrp: 600, popular: true,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL", flex: 6,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 25, taperMm: 5, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[152, 251], [156, 254], [159, 257], [162, 260]]), ...wide([[159, 264], [162, 267]])],
    overview: "A directional all-mountain board for riders who spend most days off the groomers.",
    review: { score: 87, pros: ["Great in soft snow", "Stable"], cons: ["Not for switch riding"] },
  },
  {
    brand: "jones", model: "Dreamcatcher", modelYear: 2025, womens: true, msrp: 500,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL", flex: 5,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 20, taperMm: 5, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: reg([[143, 236], [146, 238], [149, 240], [152, 242], [155, 244]]),
    overview: "A women's directional all-mountain board that floats easily and holds a carve.",
    review: { score: 85, pros: ["Floats in powder", "Smooth carver"], cons: ["Directional only"] },
  },
  {
    brand: "capita", model: "Defenders of Awesome", modelYear: 2025, lineageKey: "capita-doa", msrp: 500, popular: true,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_CAMBER", shape: "TRUE_TWIN", flex: 5.5,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[150, 249], [152, 250], [154, 252], [156, 253], [158, 255], [160, 257]]), ...wide([[155, 260], [157, 262], [159, 264]])],
    overview: "A hugely popular all-mountain freestyle twin with lively pop and strong edge hold.",
    review: { score: 88, pros: ["Poppy and fun", "Strong for a twin"], cons: ["Not a powder board"] },
  },
  {
    brand: "capita", model: "Paradise", modelYear: 2025, womens: true, msrp: 480,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_CAMBER", shape: "TRUE_TWIN", flex: 5,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: reg([[143, 235], [145, 237], [147, 238], [149, 240], [151, 241]]),
    overview: "A women's all-mountain twin with a balanced flex that's equally at home in the park and on groomers.",
    review: { score: 85, pros: ["Balanced and versatile", "Fun pop"], cons: ["Average in deep powder"] },
  },
  {
    brand: "ride", model: "Algorythm", modelYear: 2025, msrp: 550,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL", flex: 6,
    core: "Wood", laminate: "CARBON_FIBERGLASS", setbackMm: 20, taperMm: 5, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[151, 250], [154, 252], [157, 254], [160, 257]]), ...wide([[158, 262], [162, 266]])],
    overview: "A directional all-mountain board for carving hard on groomers and cruising soft snow.",
    review: { score: 83, pros: ["Strong carver", "Damp"], cons: ["Less playful"] },
  },
  {
    brand: "never-summer", model: "Proto Synthesis", modelYear: 2025, lineageKey: "never-summer-proto", msrp: 700, popular: true,
    ability: ["ADVANCED", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_ROCKER", shape: "TRUE_TWIN", flex: 7,
    core: "Wood", laminate: "CARBON_FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[152, 251], [155, 253], [158, 255], [161, 258]]), ...wide([[158, 262], [161, 265]])],
    overview: "A tough, responsive twin that's lively in the park and powerful enough for the whole mountain.",
    review: { score: 88, pros: ["Very durable", "Responsive and poppy"], cons: ["Pricey"] },
  },
  {
    brand: "arbor", model: "Element Camber", modelYear: 2025, msrp: 550,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "CAMBER", shape: "DIRECTIONAL_TWIN", flex: 6,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 12, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[152, 250], [155, 252], [158, 255], [161, 257]]), ...wide([[158, 262], [161, 264]])],
    overview: "A classic camber all-mountain board with a solid, predictable feel and good pop.",
    review: { score: 83, pros: ["Solid and predictable", "Good pop"], cons: ["Catchy for beginners"] },
  },
  {
    brand: "salomon", model: "Assassin", modelYear: 2025, msrp: 500,
    ability: ["INTERMEDIATE", "EXPERT"], category: "ALL_MOUNTAIN", profile: "HYBRID_CAMBER", shape: "TRUE_TWIN", flex: 6,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[150, 250], [153, 252], [156, 254], [159, 256]]), ...wide([[156, 262], [159, 264]])],
    overview: "A lively all-mountain twin that blends park playfulness with solid edge hold.",
    review: { score: 83, pros: ["Lively and versatile", "Good value"], cons: ["Average in deep snow"] },
  },

  // ───────────── Freestyle / park ─────────────
  {
    brand: "lib-tech", model: "Skate Banana", modelYear: 2025, lineageKey: "lib-tech-skate-banana", msrp: 550, popular: true,
    ability: ["BEGINNER", "EXPERT"], category: "FREESTYLE_PARK", profile: "FULL_ROCKER", shape: "TRUE_TWIN", flex: 4,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[147, 248], [150, 250], [153, 251], [156, 253], [159, 255]]), ...wide([[156, 262], [159, 264]])],
    overview: "A loose, buttery rocker twin built for jibbing, pressing and easygoing fun.",
    review: { score: 84, pros: ["Buttery and forgiving", "Grips well for rocker"], cons: ["Loose at speed"] },
  },
  {
    brand: "gnu", model: "Headspace", modelYear: 2025, msrp: 550,
    ability: ["INTERMEDIATE", "EXPERT"], category: "FREESTYLE_PARK", profile: "HYBRID_CAMBER", shape: "TRUE_TWIN", flex: 5,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[149, 249], [152, 251], [155, 253], [158, 255]]), ...wide([[156, 261], [159, 263]])],
    overview: "A park and all-mountain freestyle twin with a balanced flex and solid edge hold.",
    review: { score: 84, pros: ["Balanced flex", "Grippy edges"], cons: ["Heavier than peers"] },
  },
  {
    brand: "gnu", model: "Gloss", modelYear: 2025, womens: true, msrp: 450,
    ability: ["BEGINNER", "ADVANCED"], category: "FREESTYLE_PARK", profile: "HYBRID_ROCKER", shape: "TRUE_TWIN", flex: 4,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "extruded",
    sizes: reg([[140, 233], [144, 235], [147, 237], [150, 239]]),
    overview: "A soft women's twin for learning tricks and playing around the mountain.",
    review: { score: 81, pros: ["Easy to press", "Forgiving"], cons: ["Soft for big jumps"] },
  },
  {
    brand: "capita", model: "Ultrafear", modelYear: 2025, msrp: 480,
    ability: ["INTERMEDIATE", "EXPERT"], category: "FREESTYLE_PARK", profile: "HYBRID_CAMBER", shape: "TRUE_TWIN", flex: 4,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[147, 247], [149, 249], [151, 250], [153, 251], [155, 253]]), ...wide([[155, 260]])],
    overview: "A soft, playful street and park board made for rails, presses and creative riding.",
    review: { score: 83, pros: ["Great for jibbing", "Easy to press"], cons: ["Soft for big jumps"] },
  },
  {
    brand: "ride", model: "Twinpig", modelYear: 2025, msrp: 500,
    ability: ["INTERMEDIATE", "EXPERT"], category: "FREESTYLE_PARK", profile: "HYBRID_CAMBER", shape: "TRUE_TWIN", flex: 5,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: reg([[145, 255], [148, 257], [151, 259], [154, 261], [157, 263]]),
    overview: "A short, wide twin you ride several sizes down for a quick, playful feel and easy spins.",
    review: { score: 83, pros: ["Quick and spinny", "Fits big feet"], cons: ["Odd sizing to learn"] },
  },
  {
    brand: "yes", model: "Basic", modelYear: 2025, msrp: 420,
    ability: ["BEGINNER", "ADVANCED"], category: "FREESTYLE_PARK", profile: "HYBRID_CAMBER", shape: "TRUE_TWIN", flex: 5,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "extruded",
    sizes: [...reg([[148, 248], [152, 250], [155, 252], [158, 254]]), ...wide([[158, 262]])],
    overview: "A no-frills, affordable freestyle twin that's easy to ride and fun to learn tricks on.",
    review: { score: 81, pros: ["Great value", "Easy to ride"], cons: ["Basic base material"] },
  },
  {
    brand: "rome", model: "Artifact", modelYear: 2025, msrp: 450,
    ability: ["INTERMEDIATE", "EXPERT"], category: "FREESTYLE_PARK", profile: "HYBRID_ROCKER", shape: "TRUE_TWIN", flex: 4,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 0, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "extruded",
    sizes: [...reg([[148, 248], [151, 250], [153, 251], [155, 253]]), ...wide([[155, 260]])],
    overview: "A soft, durable jib board for riders who spend their days on rails and boxes.",
    review: { score: 80, pros: ["Durable for rails", "Easy to press"], cons: ["Loose at speed"] },
  },

  // ───────────── Freeride ─────────────
  {
    brand: "jones", model: "Flagship", modelYear: 2025, lineageKey: "jones-flagship", msrp: 700,
    ability: ["ADVANCED", "EXPERT"], category: "FREERIDE", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL", flex: 8,
    core: "Wood", laminate: "CARBON_FIBERGLASS", setbackMm: 25, taperMm: 10, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[154, 252], [158, 255], [161, 257], [164, 260]]), ...wide([[161, 263], [164, 266]])],
    overview: "A stiff, powerful freeride board for steep lines, big faces and fast powder days.",
    review: { score: 88, pros: ["Powerful and stable", "Floats well"], cons: ["Demanding", "Not for park"] },
  },
  {
    brand: "burton", model: "Flight Attendant", modelYear: 2025, lineageKey: "burton-flight-attendant", msrp: 650, popular: true,
    ability: ["INTERMEDIATE", "EXPERT"], category: "FREERIDE", profile: "CAMBER", shape: "DIRECTIONAL", flex: 6.5,
    core: "Super Fly II wood", laminate: "CARBON_FIBERGLASS", setbackMm: 20, taperMm: 5, insertPattern: "CHANNEL", baseType: "sintered",
    sizes: [...reg([[152, 251], [156, 254], [159, 256], [162, 258]]), ...wide([[159, 262], [163, 265]])],
    overview: "A directional camber board that handles powder, steeps and fast groomers with confidence.",
    review: { score: 86, pros: ["Confident in steeps", "Floats well"], cons: ["Directional only"] },
  },
  {
    brand: "lib-tech", model: "T.Rice Pro", modelYear: 2025, lineageKey: "lib-tech-trice-pro", msrp: 650, popular: true,
    ability: ["ADVANCED", "EXPERT"], category: "FREERIDE", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL", flex: 7,
    core: "Wood", laminate: "CARBON_FIBERGLASS", setbackMm: 20, taperMm: 5, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[153, 250], [155, 252], [157, 254], [159, 256], [161, 258]]), ...wide([[159, 262], [161.5, 265]])],
    overview: "An aggressive freeride board with serrated edges that grip on ice and power through big lines.",
    review: { score: 86, pros: ["Ice-gripping edges", "Powerful"], cons: ["Stiff for casual riders"] },
  },
  {
    brand: "arbor", model: "Bryan Iguchi Pro", modelYear: 2025, msrp: 650,
    ability: ["ADVANCED", "EXPERT"], category: "FREERIDE", profile: "HYBRID_ROCKER", shape: "DIRECTIONAL", flex: 6,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 25, taperMm: 8, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[154, 252], [157, 255], [160, 258], [163, 260]]), ...wide([[160, 262]])],
    overview: "A surfy freeride board for flowing powder turns and natural-terrain riding.",
    review: { score: 84, pros: ["Surfy in powder", "Smooth ride"], cons: ["Less pop on hardpack"] },
  },
  {
    brand: "jones", model: "Twin Sister", modelYear: 2025, womens: true, msrp: 550,
    ability: ["INTERMEDIATE", "EXPERT"], category: "FREERIDE", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL_TWIN", flex: 6,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 12, taperMm: 0, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: reg([[142, 236], [146, 239], [149, 241], [152, 243], [155, 245]]),
    overview: "A women's all-terrain directional twin that's stable at speed and playful in soft snow.",
    review: { score: 86, pros: ["Versatile all-terrain", "Stable"], cons: ["Firm for beginners"] },
  },

  // ───────────── Powder / surf ─────────────
  {
    brand: "lib-tech", model: "Orca", modelYear: 2025, lineageKey: "lib-tech-orca", msrp: 650, popular: true,
    ability: ["ADVANCED", "EXPERT"], category: "POWDER_SURF", profile: "HYBRID_CAMBER", shape: "TAPERED_DIRECTIONAL", flex: 7,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 30, taperMm: 15, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: reg([[147, 265], [150, 266], [153, 268], [156, 270], [159, 272]]),
    overview: "A short, wide, tapered board that floats in deep snow and still carves on the way back to the lift.",
    review: { score: 87, pros: ["Huge float", "Carves well for a fat board"], cons: ["Slow edge to edge"] },
  },
  {
    brand: "jones", model: "Storm Chaser", modelYear: 2025, msrp: 700,
    ability: ["ADVANCED", "EXPERT"], category: "POWDER_SURF", profile: "HYBRID_CAMBER", shape: "TAPERED_DIRECTIONAL", flex: 7,
    core: "Wood", laminate: "CARBON_FIBERGLASS", setbackMm: 30, taperMm: 20, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: reg([[148, 258], [152, 260], [157, 264], [161, 268]]),
    overview: "A surf-inspired swallowtail-style board for powder days and tight, surfy turns.",
    review: { score: 85, pros: ["Surfy turns", "Great in powder"], cons: ["Niche on hardpack"] },
  },
  {
    brand: "ride", model: "Warpig", modelYear: 2025, lineageKey: "ride-warpig", msrp: 550, popular: true,
    ability: ["INTERMEDIATE", "EXPERT"], category: "POWDER_SURF", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL", flex: 5,
    core: "Wood", laminate: "FIBERGLASS", setbackMm: 25, taperMm: 5, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: reg([[142, 256], [148, 260], [151, 262], [154, 263], [157, 265]]),
    overview: "A short, fat directional board you ride a few sizes down for quick turns and big float.",
    review: { score: 85, pros: ["Quick and floaty", "Fun in trees"], cons: ["Unusual sizing"] },
  },
  {
    brand: "burton", model: "Fish 3D", modelYear: 2025, msrp: 650,
    ability: ["INTERMEDIATE", "EXPERT"], category: "POWDER_SURF", profile: "FLAT_ROCKER", shape: "TAPERED_DIRECTIONAL", flex: 5,
    core: "Super Fly II wood", laminate: "FIBERGLASS", setbackMm: 35, taperMm: 20, insertPattern: "CHANNEL", baseType: "sintered",
    sizes: reg([[150, 254], [156, 257], [161, 260]]),
    overview: "A swallowtail powder board with sculpted base contours for loose, surfy turns.",
    review: { score: 84, pros: ["Surfy and loose", "Effortless float"], cons: ["Weak on ice"] },
  },

  // ───────────── Splitboard ─────────────
  {
    brand: "jones", model: "Solution Splitboard", modelYear: 2025, msrp: 1000,
    ability: ["ADVANCED", "EXPERT"], category: "SPLITBOARD", profile: "HYBRID_CAMBER", shape: "DIRECTIONAL", flex: 8,
    core: "Wood", laminate: "CARBON_FIBERGLASS", setbackMm: 25, taperMm: 10, insertPattern: "FOUR_X_FOUR", baseType: "sintered",
    sizes: [...reg([[154, 254], [158, 256], [161, 258], [164, 261]]), ...wide([[161, 264]])],
    overview: "A capable backcountry splitboard that climbs efficiently and rides with real freeride confidence.",
    review: { score: 86, pros: ["Strong descender", "Efficient tourer"], cons: ["Expensive"] },
  },
  {
    brand: "burton", model: "Family Tree Hometown Hero Split", modelYear: 2025, msrp: 1000,
    ability: ["ADVANCED", "EXPERT"], category: "SPLITBOARD", profile: "CAMBER", shape: "DIRECTIONAL", flex: 7,
    core: "Super Fly II wood", laminate: "CARBON_FIBERGLASS", setbackMm: 20, taperMm: 8, insertPattern: "CHANNEL", baseType: "sintered",
    sizes: reg([[152, 253], [156, 256], [160, 259], [164, 262]]),
    overview: "A directional camber splitboard for long tours and confident descents in varied snow.",
    review: { score: 84, pros: ["Confident descents", "Light for a split"], cons: ["Pricey"] },
  },
];
