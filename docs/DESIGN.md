# Design: Schema & Scoring (Stage 1 draft, for review)

Files:
- `prisma/schema.prisma`: data model
- `src/lib/scoring/weights.ts`: every weight and constant, in one place
- `src/lib/scoring/types.ts`: the engine's inputs and outputs
- `src/lib/scoring/regions.ts`: default snow mix for each region
- `src/lib/scoring/kit.ts`: "My Kit" trait vocabulary and quiver job names

---

## 1. Data model

```
brands ──< products >── 1:1 ── skis ──< ski_sizes
                     ├─ 1:1 ── snowboards ──< board_sizes
                     ├─ 1:1 ── ski_bindings / snowboard_bindings
                     ├─ 1:1 ── ski_boots / snowboard_boots
                     ├──< images
                     ├──< review_scores >── review_sources
                     └──< retailer_prices >── retailers

users ──< rider_profiles ──< recommendation_runs ──< recommendation_items >── products
users ──< owned_gear (My Kit) >── products (optional match)
```

**Why a shared `products` table plus 1:1 spec tables:** images, reviews, prices, kit items and recommendation items each need a single foreign key, whatever the product type. The six spec tables still exist under the names you asked for.

**Sizes get their own rows.** Waist and turn radius change with ski length. For boards, the manufacturer's rider-weight range is the best size filter. Both tables drive the hard size filter.

**Reviews:** each row stores the normalized 0–100 score, the published raw score, the source, the URL, the review date, the model year reviewed, and short pros/cons that we paraphrase ourselves. No review text is copied. The refresh script caches `products.reviewScoreAgg`.

**Images:** each row stores `source` (press kit or affiliate feed), `sourceName`, `licenseNote` and `view` (base, top sheet, profile). A health check sets `lastVerifiedAt`. The UI falls back to an illustrated silhouette for the product's category.

**Prices:** one row per product, retailer and (optionally) size. `checkedAt` drives the 7-day hide rule. The `MOCK` network is for development until affiliate approval.

**Hooks for a future feedback loop:** each engine run is saved as a `RecommendationRun` with a snapshot of the inputs and the engine and weights versions, plus its `RecommendationItem`s. A later `RecommendationFeedback` table can point at an item. A sketch is at the bottom of the schema.

### My Kit (your addition)
`owned_gear` stores gear the rider already owns. Each item is either matched to the catalog or entered as free text with a few rough specs (waist, flex, sole norm, brake width). Each item has:
- **intent**: `KEEP` (stays in the quiver), `REPLACE` (find a successor), or `UNSURE`
- **likes / dislikes** from a fixed list (`TOO_STIFF`, `CHATTERY`, `SINKS_IN_POWDER`, `EDGE_GRIP`, …)
- **fitIssues** for boots (`HEEL_LIFT`, `TOE_BANG`, …)
- condition and purchase year

Guests get the same data shape, held in client state. Signed-in users have it saved. The kit is edited on its own "My Kit" page under My Profile, and the survey offers it as an optional step (Q12).

How the engine uses the kit:

| Kit signal | Effect |
|---|---|
| Dislikes or likes on a REPLACE item | Nudge targets: e.g. TOO_STIFF → flex −1, SINKS_IN_POWDER → waist +8mm, CHATTERY → flex +0.5 and a preference for metal. Each field is capped (flex ±1.5, waist ±10mm, length ±4cm). Shown in "why" text: "You said your Mantra felt chattery → …" |
| KEEP ski or board | Quiver builder treats it as a fixed piece and fills the gaps around it. Main-list picks that do the same job get an `OVERLAPS_KIT` tag. They're only penalized in quiver mode. |
| KEEP boots (sole norm) | Hard filter on binding sole compatibility |
| KEEP bindings (brake width) | Hard filter: ski waist ≤ brake width ≤ waist + 15mm. Remounting is noted. |
| Boot fitIssues | Steer last width (FOREFOOT_PINCH → wider, HEEL_LIFT → narrower) and add fitting notes |
| Matched catalog item | Comparisons like "12mm wider than your current ski" |

`kitMode` (REPLACE / ADD_TO_QUIVER / FRESH_START) controls how much the kit affects the main ranking.

---

## 2. Scoring pipeline (pure functions, no I/O)

```
RiderInput ─► deriveTargets ─► hardFilter ─► scoreEach ─► budgetRank ─► reasons/whyNot
                                                  └────► quiverBuilder
                                                  └────► setupMatcher (bindings+boots)
```

### Step 0: Derive targets (`RiderTargets`)
- **Snow mix:** the region's default (`regions.ts`), replaced by the user's snow preference if set.
- **Flex target (1–10):** base by ability (beginner 3, intermediate 5, advanced 7, expert 8). Add 0.5 per 10kg away from 75kg, capped at ±1.5. Playful −1, charging +1. Mostly park −1.5, moguls −0.5, steeps +0.5. Add kit nudges, then clamp to 1–10.
- **Ski length target:** height plus an offset by ability (−15, −8, −2, +3 cm). Add 0.25cm per kg over the typical weight for that height (BMI 23), capped at ±5. Playful −4, charging +4. A category offset is added per product (powder +5, park −4, …).
- **Board length target:** 70% from weight (125 + 0.42×kg) and 30% from height (height × 0.88). Then adjust for ability, style and category. When a size has a manufacturer rider-weight range, that range is the hard filter, with 10% slack.
- **Board width:** US men's 11+ requires a wide board (waist ≥ 258mm). 10.5 makes a wide board preferred.
- **DIN estimate:** an ISO 11088-style chart from weight, height, age, skier type (from ability and style) and boot sole length (estimated from mondo size). It is always shown as a range, and always with: "General guidance only. A certified shop technician must set your DIN."
- **Boots:** flex range from ability, gender and weight (e.g. men's advanced 110–130, women's advanced 95–115, ±10 per 15kg). Last width from foot width (narrow ≤98, medium 99–101, wide ≥102mm), adjusted for fit issues. Always with: "Get fitted in person."
- **Conflicts:** beginner plus steeps or backcountry, or beginner plus charging, produces a gentle note and switches to the conflict fit weights (skill 22.5%, terrain 7.5%).

### Step 1: Hard filters
Sport and product type. At least one size within the hard tolerance (ski ±8cm, board ±6cm or inside the weight range). Wide board required. Compatibility with any KEEP boots or bindings. Rider ability within the product's range ±1 level.

### Step 2: Score each item (0–100)

| Component | Weight | How |
|---|---|---|
| **Skill ↔ flex** | 15 | 70% flex match: `1 − (|flex − target| / 4)^1.5`. 30% ability-range match: inside the range 1, one level off 0.5. |
| **Conditions ↔ width/rocker** | 15 | 60% waist vs. the ideal waist for each snow type, blended by the snow mix. 40% rocker or board profile vs. the snow mix (rocker for powder, camber for ice). |
| **Terrain & style** | 15 | 60% average fit across the chosen terrains, from a category × terrain table adjusted by specs (twin tip helps park, metal helps groomers and steeps, low weight helps backcountry). 40% style: `1 − |productStyleAxis − riderStyleAxis| / 2`. The product's style axis comes from flex, metal, mount point and rocker. |
| **Review score** | 40 | Weighted mean over sources: source credibility × recency (half-life 1 year), prior-year reviews of an unchanged model at 0.7. Then pulled toward the category mean as if it had 2 average reviews. No reviews: category mean × 0.9, tagged `LIMITED_REVIEWS`. |
| **Brand reputation** | 10 | 0.4 durability + 0.3 warranty + 0.3 review consensus |
| **Demographic** | 5 | Rules below. If age and gender are both missing, this is skipped and the other weights are scaled up by 1/0.95. |

**Size fit** is a multiplier from 0.85 to 1.0 on the fit block. It is 1.0 within ±4cm of target and falls off linearly to the hard limit. This keeps a great ski that's slightly off-size in the list, just lower.

**Demographic rules** (each scores the product 0–1; their average is the component):
- Young (≤25) + advanced/expert + playful or park → softer flex, twin tip, centered mount
- Older (55+) or light (<60kg) → lighter weight per cm, flex at or below target
- Heavy (>95kg) or charging → stiffer, metal laminate, more mass
- Beginner → forgiving flex and tip rocker, regardless of age
- Gender = female → small boost for women's-specific models. Never a filter.

> **Decision for you:** weight is always provided, so the heavy and light rules also move the flex target inside Fit. The 5% component only adds the age- and gender-specific rules. That keeps the "skip when demographics are missing" rule meaningful.

### Step 3: Budget
- The price used is the lowest retailer price checked within the last 7 days, otherwise MSRP (labeled as MSRP).
- In-budget items rank first by score.
- Up to 2 **stretch picks**: the highest-scoring items priced up to 15% over budget, only if they outscore the #10 in-budget pick. Labeled "Stretch Pick".
- **Best Value**: the highest score per dollar among picks scoring ≥ 75.
- A total budget is split by default: skis 50 / bindings 20 / boots 30; boards 50 / 25 / 25. If boots are a KEEP kit item, their share goes to the others.
- **If nothing passes:** drop the budget, then widen size tolerance (ski ±12cm) and ability range, then show the closest matches tagged `CLOSEST_MATCH`. The result reports which step it used (`relaxed`).

### Step 4: Reasons ("Why this fits you")
Each sub-score produces candidate sentences filled in with the user's own answers. Each gets `impact` = points above the category average. The top 3 go on cards and the top 5 on the detail page. Kit-based reasons rank first when they apply.

### Step 5: "Why not this one?"
For `isPopular` products ranked below 10: compare each component against the #10 pick and name the 1–2 biggest gaps. Examples: "Flex 9: a lot of ski for an intermediate", "No length near your 172cm target", "$180 over your budget", "Built for hardpack; your Wasatch mix is 50% powder".

### Step 6: Bindings & boots (per top pick)
- **Ski bindings:** brake width from waist to waist+15mm, DIN range covering the estimate with headroom, sole compatible with the recommended or kept boots, touring type if backcountry is selected.
- **Board bindings:** flex within ±1.5 of the board, size fits the boot, mount compatible with the insert pattern, Step On only with Step On boots.
- **Boots:** flex range, last width, mondo size covered.

These are scored with the same component approach (fit, review, brand), but with fit weighted higher.

### Step 7: Quiver builder
Every ski or board gets a **job coverage vector** over: powder, all-mountain, groomer/hardpack, park, trees/moguls, backcountry. The rider gets a **need vector** from their snow mix and terrain. Take the top 25 singles plus any KEEP kit items, and enumerate all pairs (~300) and triples (~2,300):

```
quiverScore = 0.6 × Σ_jobs need_j × max_piece coverage_piece,j
            + 0.4 × mean(piece score)
            − 0.25 × Σ_pairs max(0, cosine(cov_i, cov_j) − 0.85)
```

Ski pairs whose waists are within 12mm of each other also count as overlap. Each piece is labeled by its strongest jobs ("Powder Bowl", "Groomer Highway", "Terrain Park"). The top 3 two-piece and top 3 three-piece quivers are shown.

---

### Provenance fields (added in Stage 1)
- `products.specsSource` / `products.specsVerifiedAt`: where the specs came from, and when a person checked them against the manufacturer.
- `review_sources.isPlaceholder`: seed-only stand-in scores. The UI must not show these as real reviews, and `--no-placeholders` leaves them out of the aggregates.
- `brands.reputationIsEstimate`: brand sub-scores are editorial estimates until they've been researched.

### Stage 2: decisions made while building the engine
These go beyond or refine the approved design. Every number is in `src/lib/scoring/weights.ts`, and the lookup tables are in `tables.ts`.

- **Where stretch picks go:** right after the top 3 in-budget picks, so they're visible without pushing an affordable pick out of the top 3.
- **Women's models for men:** the 5% demographic part gives women's-specific models a small nudge down for male riders, mirroring the nudge up for women. It's never a filter.
- **Touring skis and splitboards:** recommended only when the rider picks backcountry. Otherwise they're filtered out, with a "Why not" explanation.
- **Bindings and boots:** cheap gear that fits poorly never outranks gear that fits well. The budget preference only applies to picks with a fit of at least 0.7.
  - Hard limits: boots more than 20 flex points outside the rider's range are excluded, and so is anything two or more ability levels off.
  - Step-on bindings and boots aren't auto-paired, because they only work as a matched set.
- **Board sizing:** wide sizes are skipped for regular-size feet when a regular size exists.
- **Quivers:**
  - A piece that isn't the best at any job the rider needs costs the quiver 0.1.
  - Touring gear's resort coverage is scaled by 0.6.
  - Run names never repeat within a quiver.
- **Reasons:** every pick shows at least 2. They're all true statements about the product; the ones where it beats the average pick come first. Placeholder review scores are never described as reviews.
- **DIN:** the ISO 11088-style chart in `tables.ts` is an approximation. Check it against the current official chart before launch. It is only ever shown as a range, with the technician note.

### Running the engine
`npm run engine:try` runs six sample riders (`scripts/sampleRiders.ts`) against the seed catalog and prints picks, reasons, setups, quivers and "Why not" explanations. The same riders are used in the integration tests.

### Stage 3: prices and images
- **Feed adapters** (`src/lib/feeds/`): every source produces the same offer format.
  - `MockFeedAdapter` is for development.
  - `CsvFeedAdapter` handles the CSV/TSV datafeeds (optionally gzipped) that all four networks offer. Each feed has its own column mapping in `config/feeds.json`.
  - Adapters for the networks' APIs can be added behind the same interface.
- **Matching** (`match.ts`) is strict on purpose: same brand (with aliases and accent folding), every model token present, product type agrees, and any season mentioned is the model's season. Manual mappings override it. Unmatched offers are logged instead of guessed.
- **Prices:** one row per product, retailer and size, keeping the best offer (in stock first, then cheapest). `checkedAt` is the feed's own timestamp (never in the future). Rows older than 7 days are kept but hidden. The engine catalog loader leaves out mock prices in production.
- **Price table** (`src/lib/pricing/display.ts`): in-stock rows first, lowest price first. Best Price goes to the cheapest in-stock offer. Shows savings vs. list price and a "checked 3 hours ago" label.
- **Affiliate links:** only https links are rendered. Every link uses `target="_blank" rel="sponsored noopener"` and the disclosure text.
- **Images** (`src/lib/images/`):
  - A licensing policy check runs before anything is stored.
  - Gallery order: press kit before feed images, then top sheet → base → profile → detail → on snow, one photo per view, with a source credit.
  - One primary image per product.
  - The health check sets `brokenSince`, and broken images are skipped.
  - When nothing usable is left, the category silhouette is shown.
- **Data quality:** new checks flag broken images (`IMAGE_BROKEN`) and products whose only prices come from the mock feed (`ONLY_MOCK_PRICES`). The mock-price check is a launch blocker in `--strict` mode.
- **Schedule:** a daily GitHub Actions job (`.github/workflows/refresh-feeds.yml`). Any host's cron can run the same three commands instead.

### Stage 4: survey UI
- **Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Motion (`motion`, Framer Motion's current package name), Fredoka for headings and Inter for body text, Lucide icons.
- **Theme tokens** live in `src/app/globals.css`. Trail colors carry meaning but always come with a shape and a label (● ■ ◆ ◆◆).
  - Orange and green are fill colors only; text on them is near-black.
  - Text versions (`*-ink`) meet WCAG AA on white.
- **Flow** (`src/lib/survey/steps.ts`): 12 one-question screens in four sections.
  - The Chairlift: sport, skill, home region, snow, days.
  - Base Camp: height & weight, feet, budget.
  - The Summit: terrain, style, current gear.
  - First Chair: review.
- **Adaptive questions:**
  - Wording switches between ski and ride.
  - The stance question appears only for snowboarders.
  - Snowboarders with US 11+ boots see a wide-board note.
  - The kit step offers only the sport's own gear.
  - Gentle notes appear for conflicting answers.
- **Speed:** tap-to-answer screens move on by themselves after a tap. Keyboard users arrowing through options are never pushed ahead.
- **Saving:** the draft is kept in `localStorage`, and returning visitors land on the step where they left off.
- **Accessibility:**
  - Every option is a real radio or checkbox.
  - Focus moves to each new question.
  - Missing answers are announced and scrolled into view.
  - The progress bar is a `role="progressbar"`, and steps you've reached can be revisited from the keyboard.
- **Motion:** falling snow, the rider sliding down the run, parallax mountains and slide transitions. With `prefers-reduced-motion`, the snow is off, transitions are short fades, and nothing slides.
- **My Kit step:** add skis/board, bindings or boots.
  - Each item is matched to the catalog by type-ahead search (`/api/products/search`, accent-insensitive), or entered as free text.
  - You mark it keep, replace or not sure, and pick likes and dislikes from the trait list.
  - Boot items take fit issues, ski bindings a brake width, and ski boots a sole type.
  - The shopping goal (replace / add to quiver / fresh start) defaults to "add" when the first item is one you're keeping.
- **Submit:** answers are validated (`SurveyAnswersV1`) and posted to `/api/recommend`. The engine runs against the database catalog, cached for 10 minutes, with fresh prices. `/results` is an interim list until Stage 5.
- **Placeholders:** `/browse/*`, `/search` and `/profile` show friendly "coming soon" pages until Stages 5–6.

## 3. Data quality checks (Stage 1 script)
Flags:
- Missing required specs per kind
- No primary image
- Images not verified in 30 days
- Newest review older than 400 days (stale)
- Normalized score more than 2 standard deviations from the product's other sources (outlier)
- Brand reputation not reviewed this season
- Sizes with no waist width or weight range
- Prices older than 7 days

Output: a console table plus `reports/data-quality.json`. Exits non-zero on errors, so it can gate the refresh.

## 4. Stack notes
- **Postgres** (arrays, enums, jsonb), run locally with docker-compose.
- **Prisma 7.10** (latest stable; `latest` on npm is currently an 8.0 release candidate). The connection URL goes in `prisma.config.ts`, using the `@prisma/adapter-pg` driver adapter.
- **NextAuth:** v4 is the current stable release. v5 (Auth.js) is still in beta and in maintenance mode. I plan to use v5 with `@auth/prisma-adapter`, since it fits the App Router best. Say if you'd rather have v4.

## 5. Open questions
1. Should the fit badge show the **total** score (planned) or only the 45% fit block?
2. Should KEEP kit items lower main-list rankings (planned: tag only, penalty only in quiver mode)?
3. Should seed data cover around 40 skis, 30 boards, and 12 each of bindings and boots across major brands? Review scores and prices in the seed would be clearly marked as placeholders until real sources are entered.
