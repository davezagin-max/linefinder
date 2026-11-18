# Linefinder: ski & snowboard recommender

Status: **Stage 4: survey UI.** Stages 1 (schema, seed data, data-quality checks), 2 (scoring engine) and 3 (mock price feed, image pipeline) are also done. The results page is an interim preview until Stage 5. Design notes are in [docs/DESIGN.md](docs/DESIGN.md).

## Run it locally

You need Node 20 or newer. You don't need Docker: `prisma dev` runs a local Postgres.

```bash
npm install
npm run db:dev -- --detach   # start local Postgres (ports 51213–51216)
npx prisma migrate dev       # create tables
npm run db:seed              # validate + load seed data, then print the data-quality report
npm run prices:refresh       # load mock-feed prices
npm run dev                  # http://localhost:3000
npm test                     # unit tests
```

The app name lives in `src/lib/brand.ts`; change it there and it changes everywhere.

Other commands:

| Command | What it does |
|---|---|
| `npm run data:check` | Data-quality report. Writes `reports/data-quality.json` and exits 1 if there are errors |
| `npm run data:check -- --strict` | Launch mode: placeholder reviews, unverified specs, estimated brand scores, missing images and mock-only prices become errors |
| `npm run data:refresh` | Seasonal refresh: imports `data/incoming/*.json`, recomputes scores, runs the checks |
| `npm run prices:refresh` | Pull prices from the mock feed (dev) and any configured affiliate feeds, match them to products, store them |
| `npm run images:refresh -- --health` | Import press-kit images and health-check every stored image URL |
| `npm run engine:try-db -- wasatch` | Run a sample rider against the database catalog with live feed prices and image fallbacks |
| `npm run engine:try` | Run the recommendation engine on sample riders against the seed catalog (no database needed) |
| `npx prisma studio` | Browse the database |

## Seed data: please read

The seed catalog is a **starting point, not verified data**:

- **Specs** come from general knowledge and are stored with `specsSource = "seed:unverified"`. Until someone checks a product against the manufacturer's spec sheet and sets `specsVerifiedAt`, the data-quality report lists it as `UNVERIFIED_SPECS`.
- **Review scores** come from a source named *"Seed placeholder (not a real review)"* (`isPlaceholder = true`). They are rough reputation estimates so the engine has something to rank. They are **not** scores from any publication. Replace them with real `review_scores` rows (source, URL, date, score; no copied text). Then run the refresh with `--no-placeholders`.
- **Brand reputation** sub-scores are editorial estimates (`reputationIsEstimate = true`).
- **Images and prices** are not seeded. Run `npm run prices:refresh` to load mock-feed prices (see "Prices and images" below). Until licensed images are imported, products show category silhouettes.

`--strict` fails on all of the above, so it can be used as a launch gate.

## Prices and images

**Prices** come only from affiliate network product feeds, never from scraping retailer sites.
- Until affiliate approval, a **mock feed** supplies prices. It has five fictional retailers, all named "… (Mock)", and links point to example.com.
- The mock feed is deterministic per day. One retailer's feed is 9 days old on purpose, so the 7-day hide rule gets exercised.
- It never runs when `NODE_ENV=production`, and `--purge-mock` removes its prices.
- Each run is logged in `feed_runs`, including a sample of offers that couldn't be matched to a product.

**Connecting a real feed** (more detail comes in Stage 7):
1. Get approved by the advertiser on AvantLink, CJ, Impact or Rakuten.
2. Copy `config/feeds.example.json` to `config/feeds.json`. Add one entry per advertiser feed, and map the column names to that feed's actual header names.
3. Put the feed's download URL in the environment variable named by `urlEnv` (locally in `.env`, and as a repository secret for the scheduled job).
4. Run `npm run prices:refresh -- --dry-run` and check the matched/unmatched counts. For offers that should match but don't, add `"NETWORK:advertiserId:sku": "product-slug"` to `config/feed-mappings.json`.
5. `.github/workflows/refresh-feeds.yml` refreshes prices and images daily with the mock feed off.

**Images** come only from licensed sources:
- **Affiliate feed images** arrive with the price refresh and get an automatic license note.
- **Manufacturer press kits** are listed in `data/press-kits/<brand>.json` (format in `_example.json`). Each manifest states the kit's license terms and the hosts its images are served from. Anything off-host, non-https or unlicensed is rejected.
- The health check hides images that stop loading.
- Products without a working photo show a category silhouette from `public/placeholders/`, so there's never a broken image.

## Seasonal refresh drop format

Put a JSON file in `data/incoming/`:

```json
{
  "season": 2026,
  "brands": [],
  "skis": [ { "brand": "volkl", "model": "Mantra 102", "modelYear": 2026, "...": "same shape as prisma/seed/types.ts" } ],
  "snowboards": [], "skiBindings": [], "snowboardBindings": [], "skiBoots": [], "snowboardBoots": [],
  "discontinue": ["volkl-mantra-102-2024"]
}
```

Each file is validated with zod (`prisma/seed/schemas.ts`), upserted by slug (`brand-model-year`), and moved to `data/imported/`.

## Layout

```
prisma/schema.prisma          data model
prisma/seed/                  seed types, zod schemas, data, loader
scripts/                      data-quality, refresh, shared upsert/recompute
src/lib/scoring/              engine config (weights.ts), types, review aggregation
src/lib/data-quality/         pure check functions + tests
```
