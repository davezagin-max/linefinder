import type { SnowType } from "./types";

export interface Region {
  label: string;
  /** Short "typical snow" description shown in the survey. */
  blurb: string;
  /** Default snow mix (weights sum to 1). A user snow preference replaces it. */
  snow: Record<SnowType, number>;
}

export const REGIONS: Record<string, Region> = {
  wasatch: { label: "Wasatch (Utah)", blurb: "Light, dry powder", snow: { powder: 0.5, packed: 0.3, hardpack_ice: 0.05, spring_variable: 0.15 } },
  colorado: { label: "Colorado Rockies", blurb: "Dry snow, lots of groomers", snow: { powder: 0.35, packed: 0.4, hardpack_ice: 0.1, spring_variable: 0.15 } },
  northern_rockies: { label: "Northern Rockies (MT/WY/ID)", blurb: "Deep, cold storms", snow: { powder: 0.45, packed: 0.3, hardpack_ice: 0.05, spring_variable: 0.2 } },
  pnw: { label: "Pacific Northwest", blurb: "Heavy, wet snow", snow: { powder: 0.35, packed: 0.2, hardpack_ice: 0.05, spring_variable: 0.4 } },
  sierra: { label: "Sierra Nevada", blurb: "Big storms, spring slush", snow: { powder: 0.3, packed: 0.3, hardpack_ice: 0.05, spring_variable: 0.35 } },
  northeast: { label: "Northeast", blurb: "Hardpack and ice", snow: { powder: 0.1, packed: 0.3, hardpack_ice: 0.45, spring_variable: 0.15 } },
  midwest: { label: "Midwest", blurb: "Firm, groomed runs", snow: { powder: 0.05, packed: 0.4, hardpack_ice: 0.45, spring_variable: 0.1 } },
  southwest: { label: "Southwest (NM/AZ)", blurb: "Sunny, packed powder", snow: { powder: 0.25, packed: 0.45, hardpack_ice: 0.15, spring_variable: 0.15 } },
  canada_west: { label: "Western Canada", blurb: "Deep, consistent powder", snow: { powder: 0.45, packed: 0.3, hardpack_ice: 0.05, spring_variable: 0.2 } },
  canada_east: { label: "Eastern Canada", blurb: "Cold, firm, icy", snow: { powder: 0.1, packed: 0.35, hardpack_ice: 0.45, spring_variable: 0.1 } },
  alps: { label: "Alps", blurb: "Big groomers, variable off-piste", snow: { powder: 0.2, packed: 0.5, hardpack_ice: 0.15, spring_variable: 0.15 } },
  scandinavia: { label: "Scandinavia", blurb: "Cold, firm pistes", snow: { powder: 0.2, packed: 0.45, hardpack_ice: 0.25, spring_variable: 0.1 } },
  japan: { label: "Japan", blurb: "Bottomless, light powder", snow: { powder: 0.7, packed: 0.2, hardpack_ice: 0.0, spring_variable: 0.1 } },
  southern_hemi: { label: "NZ / Australia / S. America", blurb: "Variable, often firm", snow: { powder: 0.15, packed: 0.35, hardpack_ice: 0.25, spring_variable: 0.25 } },
};
