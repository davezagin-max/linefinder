import type { BrandSeed } from "../types";

/**
 * Brand reputation sub-scores are EDITORIAL SEED ESTIMATES
 * (reputationIsEstimate = true) pending real research on durability,
 * warranty terms, and review consensus.
 */
export const BRANDS: BrandSeed[] = [
  // Skis (and some boots/bindings)
  { slug: "volkl", name: "Völkl", website: "https://www.voelkl.com", durability: 88, warranty: 75, consensus: 90 },
  { slug: "nordica", name: "Nordica", website: "https://www.nordica.com", durability: 86, warranty: 75, consensus: 89 },
  { slug: "blizzard", name: "Blizzard", website: "https://www.blizzard-tecnica.com", durability: 87, warranty: 75, consensus: 90 },
  { slug: "salomon", name: "Salomon", website: "https://www.salomon.com", durability: 82, warranty: 75, consensus: 85 },
  { slug: "atomic", name: "Atomic", website: "https://www.atomic.com", durability: 84, warranty: 75, consensus: 87 },
  { slug: "rossignol", name: "Rossignol", website: "https://www.rossignol.com", durability: 82, warranty: 75, consensus: 84 },
  { slug: "k2", name: "K2", website: "https://www.k2snow.com", durability: 80, warranty: 75, consensus: 83 },
  { slug: "head", name: "Head", website: "https://www.head.com", durability: 85, warranty: 75, consensus: 85 },
  { slug: "elan", name: "Elan", website: "https://www.elanskis.com", durability: 82, warranty: 75, consensus: 81 },
  { slug: "black-crows", name: "Black Crows", website: "https://www.black-crows.com", durability: 80, warranty: 75, consensus: 84 },
  { slug: "line", name: "LINE", website: "https://www.lineskis.com", durability: 76, warranty: 75, consensus: 86 },
  { slug: "armada", name: "Armada", website: "https://www.armadaskis.com", durability: 78, warranty: 75, consensus: 84 },
  { slug: "dps", name: "DPS", website: "https://www.dpsskis.com", durability: 85, warranty: 85, consensus: 82 },
  { slug: "faction", name: "Faction", website: "https://www.factionskis.com", durability: 78, warranty: 75, consensus: 83 },
  { slug: "fischer", name: "Fischer", website: "https://www.fischersports.com", durability: 86, warranty: 75, consensus: 84 },
  { slug: "dynastar", name: "Dynastar", website: "https://www.dynastar.com", durability: 82, warranty: 75, consensus: 82 },
  { slug: "moment", name: "Moment", website: "https://www.momentskis.com", durability: 84, warranty: 85, consensus: 83 },
  { slug: "tecnica", name: "Tecnica", website: "https://www.blizzard-tecnica.com", durability: 86, warranty: 75, consensus: 88 },
  { slug: "lange", name: "Lange", website: "https://www.lange-boots.com", durability: 87, warranty: 75, consensus: 87 },
  { slug: "dalbello", name: "Dalbello", website: "https://www.dalbello.it", durability: 83, warranty: 75, consensus: 83 },
  { slug: "marker", name: "Marker", website: "https://www.marker.net", durability: 85, warranty: 75, consensus: 86 },
  { slug: "look", name: "Look", website: "https://www.look-bindings.com", durability: 88, warranty: 75, consensus: 88 },
  { slug: "tyrolia", name: "Tyrolia", website: "https://www.tyrolia.com", durability: 84, warranty: 75, consensus: 82 },
  // Snowboards, bindings, boots
  { slug: "burton", name: "Burton", website: "https://www.burton.com", durability: 85, warranty: 85, consensus: 87 },
  { slug: "lib-tech", name: "Lib Tech", website: "https://www.lib-tech.com", durability: 90, warranty: 85, consensus: 86 },
  { slug: "gnu", name: "GNU", website: "https://www.gnu.com", durability: 88, warranty: 85, consensus: 84 },
  { slug: "jones", name: "Jones", website: "https://www.jonessnowboards.com", durability: 87, warranty: 85, consensus: 89 },
  { slug: "capita", name: "CAPiTA", website: "https://www.capitasnowboarding.com", durability: 86, warranty: 80, consensus: 88 },
  { slug: "ride", name: "Ride", website: "https://www.ridesnowboards.com", durability: 82, warranty: 80, consensus: 83 },
  { slug: "never-summer", name: "Never Summer", website: "https://www.neversummer.com", durability: 92, warranty: 90, consensus: 87 },
  { slug: "arbor", name: "Arbor", website: "https://www.arborcollective.com", durability: 85, warranty: 80, consensus: 84 },
  { slug: "yes", name: "YES.", website: "https://www.yesnowboard.com", durability: 83, warranty: 80, consensus: 85 },
  { slug: "nitro", name: "Nitro", website: "https://www.nitrosnowboards.com", durability: 82, warranty: 80, consensus: 82 },
  { slug: "union", name: "Union", website: "https://www.unionbindingcompany.com", durability: 88, warranty: 85, consensus: 90 },
  { slug: "thirtytwo", name: "ThirtyTwo", website: "https://www.thirtytwo.com", durability: 84, warranty: 75, consensus: 86 },
  { slug: "vans", name: "Vans", website: "https://www.vans.com", durability: 82, warranty: 75, consensus: 84 },
  { slug: "rome", name: "Rome", website: "https://www.romesnowboards.com", durability: 82, warranty: 80, consensus: 82 },
  { slug: "dc", name: "DC", website: "https://www.dcshoes.com", durability: 80, warranty: 75, consensus: 81 },
];
