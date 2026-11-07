# Phase 12.1 - Pairwise Bridge Polygons

Phase 12 locks down the geometry model before any bridge-polygon work begins.

## 12.1.1 Confirm the Reading

The qualifying station pairs are the ones whose inter-station distance is less than or equal to `6 km`.

That is equivalent to saying the pair midpoint is at most `3 km` from each station.

## 12.1.2 Confirm the Shape

This phase assumes a circle-overlap lens between the two stations.
If you meant a straight connecting band or corridor instead, call that out before Phase 12.4, because the shape-generation logic changes completely.

## 12.1.3 Decide the Border Color

For a bridge polygon that spans two stations with different AQI categories, the border should use the more severe station's AQI color.
If both stations fall in the same category, the border uses that shared category color.

## 12.1.4 Recommended Default

Use a two-tone border split at the lens's two pointed tips.
Each half should take the CPCB color of the nearer station, so the outline shows both station contributions instead of collapsing them into a single mixed border.

This is a product decision, not just styling: it preserves the lens geometry visually and keeps each side's provenance readable when the stations fall into different AQI bands.

## 12.1.5 Decide the Fill

Use no fill for the lens region by default, so the bridge reads as a border-only connection rather than a blended area.

A blended or averaged fill would blur the two source stations together and make the shape look like a single mixed AQI patch, which is less useful for provenance and harder to read alongside the two-tone border.

## 12.1.7 Recommended Default

Keep the lens border only, with no fill, by default.
Blended fills read poorly when the CPCB colors are far apart on the scale, such as Good green next to Severe maroon, because the interior stops reading as a clear bridge and starts reading like a muddy compromise.

## 12.1a Visibility Requirements

Treat this as a hard requirement, not a style suggestion.

### 12.1a.1 Border Weight

Set the border weight to `4-5`, not the common `2-3`, so the two-tone split reads clearly at normal zoom instead of only at close zoom.

### 12.1a.2 Border Opacity

Set the border opacity to `1` so the outline stays fully opaque.
A semi-transparent border can disappear inconsistently depending on the basemap feature underneath it, which makes the bridge harder to read and less stable visually.

### 12.1a.3 Circle Fill Opacity

Set the circle fillOpacity to `0.55-0.65`, well above Leaflet's typical `0.2-0.3` default, so CPCB categories are legible at a glance without checking the legend.

### 12.1a.4 Official CPCB Palette

Use the full-saturation official CPCB hex colors from `getAqiColor()` as the source of truth here. This was checked against the actual OSM basemap tiles, not a blank canvas, so the chosen bridge style stays legible over parks, water, and road backgrounds.
Do not substitute any softened or pastel circle-era variant, because the bridge border and fill rules depend on the exact CPCB category colors.


### 12.1a.5 Iterative Basemap Check

If any CPCB color, especially lighter categories like Good or Satisfactory, is hard to distinguish against a specific OSM basemap feature, adjust the visibility settings and re-test iteratively on the real map tiles.
Do not assume a blank canvas is enough, because parks, water, and roads can change the perceived contrast a lot.

## 12.2 Identify Qualifying Station Pairs

### 12.2.1 Reuse the Existing Matrix

Reuse the pairwise distance matrix already computed in Phase 8.2.4. Do not recompute distances from scratch.
The bridge selection step should read the existing distance report and filter it down to the qualifying pairs for the Phase 12 bridge work.

### 12.2.2 Filter by Distance

Filter the matrix to pairs where distance is less than or equal to 6 km.
Anything above that threshold stays out of the bridge-pair set and is rejected before the rest of the lens logic runs.

### 12.2.3 Count the Qualifying Pairs

On the current 6-station matrix, 7 of the 15 total pairs qualify and 8 are rejected.

### 12.2.4 Sanity-Check the Geography

Compare the filtered result against obvious nearby stations before trusting the threshold logic. For example, a close pair such as Ballygunge and Jadavpur should not disappear from the qualifying set if the matrix is correct.
If a pair you know is geographically close does not qualify, re-check the existing distance report before looking for a bug in the filter.

### 12.2.5 Record the Qualifying Pair List

Write the qualifying pair list to an intermediate artifact such as /scripts/output/qualifying_pairs.json so Phase 12.4 has a clear, inspectable input.

## 12.3 Generate the Fixed 3 km Circles (Base Layer)

### 12.3.1 Build One `turf.circle()` Per Station

Build one `turf.circle()` with a radius of `3 km` for each station and write the resulting base layer out as a reusable geometry artifact.
This base layer is the fixed seed for later Phase 12 bridge work, because the pairwise lens rule is defined from the same 3 km half-distance geometry.

### 12.3.2 Confirm the Storage Boundary

Store these 3 km circles separately from the older Phase 3.4 1 km circle dataset and the Phase 8 Voronoi cells. Do not overwrite either existing dataset; this Phase 12 layer belongs in its own `scripts/output` artifact path so it stays inspectable without disturbing the earlier geometry outputs.

### 12.3.3 Tag Each Circle with `station_id`

Keep each circle feature keyed by `station_id` so later bridge steps can join the base layer back to the station master without guessing.

### 12.3.4 Export to `public/data/circles_3km.json`

Export the same 3 km circle FeatureCollection to `aqi-dashboard/public/data/circles_3km.json` for the frontend to load as a public asset.
That public file is a separate delivery from the private `scripts/output` artifacts, so Phase 12 can expose the base layer without overwriting the earlier Voronoi dataset.

### 12.3.5 Static Regeneration Note

This geometry is static because station locations do not move. Re-run the export only when station coordinates change, following the same discipline as the Phase 8.7.4 Voronoi export note.

## 12.4 Generate Bridge Polygons for Qualifying Pairs

### 12.4.1 Load the Qualifying Pairs List

Load the qualifying pairs list from `aqi-dashboard/scripts/output/qualifying_pairs.json` and treat it as the bridge polygon phase input.
That keeps Phase 12.4 anchored to the inspected 12.2.5 artifact instead of recomputing the pair filter again.

### 12.4.2 Retrieve Both 3 km Circles

For each qualifying pair, retrieve both stations' 3 km circles from `aqi-dashboard/public/data/circles_3km.json` so the later polygon step has the two source geometries in hand.
Do not rebuild the circles here; this step should only join the already-exported Phase 12.3 base layer back to the pair list.

### 12.4.3 Compute the Circle Intersection

Compute the intersection of the two circles with `turf.intersect()`. The overlapping area is the lens-shaped bridge polygon that Phase 12 uses as the pairwise base geometry.
If a pair does not produce an intersection, treat that as a geometry error because qualifying pairs are expected to form a lens.

### 12.4.4 Tag the Polygon with Both Station IDs

Tag each resulting polygon with `station_id_a` and `station_id_b` so the 12.6 rendering step knows which two stations drive the two-tone border.
Keep the pair ordering stable and use the same `from` station as `station_id_a` and the `to` station as `station_id_b` so the border logic can stay deterministic.

### 12.4.5 Filter Exact 6 km Touch Pairs

If a qualifying pair's inter-station distance is exactly `6 km`, the two 3 km circles only touch at a single point and do not form a real polygon.
Detect that degenerate case before `turf.intersect()` runs and filter it out instead of trying to render a zero-area shape.

### 12.4.6 Filter Unexpected Null Intersections

If `turf.intersect()` still returns `null` for a qualifying pair, skip that pair silently instead of throwing.
This should not happen if the distance filter is correct, but the bridge generator should guard against it so the rest of the valid lens polygons can still render.

### 12.4.7 Export the Surviving Polygons

Export the surviving bridge polygons to `aqi-dashboard/public/data/bridge_polygons.json` as a GeoJSON FeatureCollection.
That public asset should contain only the polygons that survived the exact 6 km touch filter and any unexpected null-intersection guard.

### 12.4.8 Validate the Export Count

Validate that the number of exported polygons exactly matches the qualifying pair count from 12.2.3 minus any degenerate or null-intersection pairs filtered in 12.4.5 and 12.4.6.
If the count ever drifts, log the specific dropped pairs and their skip reasons before failing so the shortfall is explainable instead of silent.

## 12.5 Decide What the Button Actually Does

### 12.5.1 Note the Ambiguity

The original phrasing, "a button that generates new polygons," is ambiguous.
It sounds like on-demand, client-triggered generation, which is different from the precomputed-static-asset pattern already used for the Phase 8 Voronoi output and the Phase 12.3 base circles.

### 12.5.2 Weigh Option (a)

Choose the precomputed model: run 12.3 and 12.4 at build time, then let the button simply toggle the visibility of the already-built bridge-polygon layer.
That keeps the interaction fast, avoids client-side geometry generation, and matches the static Voronoi pattern instead of inventing a new runtime pipeline.

### 12.5.3 Weigh Option (b)

A genuinely computed-on-click button would run the circle and intersection math in the browser, which means Turf or an equivalent geometry library has to ship in the client bundle.
That re-opens the original Phase 2.3 discipline of avoiding Turf on the client, so this option trades simplicity of the button label for a heavier runtime and a larger frontend payload.

### 12.5.4 Default Recommendation

Choose option (a) by default.
Station locations do not change between sessions, so there is nothing meaningful to generate at click time, and the same visual experience can be achieved by toggling a precomputed layer with no client-side geometry cost.

### 12.5.5 Exception

If you specifically plan to let users adjust the 3 km or 6 km thresholds interactively later, flag that now.
That changes 12.3 and 12.4 from a static build script into a client-side utility module, which is a meaningfully larger scope than what is written here.

### 12.5.6 Confirm Before 12.6

Whichever option you pick, confirm it explicitly before starting 12.6.
The component structure differs depending on the choice: a static `<GeoJSON data={...}>` layer is a different shape from a stateful component that computes and stores its own geometry.

## 12.6 Render the New Layers

### 12.6.1 Build `<BridgeLayer />`

Build `<BridgeLayer />` to import the Phase 12.4.7 `bridge_polygons.json` GeoJSON FeatureCollection and render the surviving polygons as a precomputed layer.
The layer should stay passive and visibility-driven, because the geometry has already been generated at build time.

### 12.6.2 Apply the Two-Tone Border

Apply the two-tone border convention from 12.1.4 by drawing the bridge polygons with paired station-colored strokes instead of the default Phase 3.4 circle styling.
Use the heavy-weight, full-opacity stroke treatment from 12.1a so the bridge reads clearly and does not inherit the softer circle-era defaults.

### 12.6.3 Build <Circle3kmLayer />

Build or extend <Circle3kmLayer /> to import the Phase 12.3.4 circles_3km.json FeatureCollection and render the fixed 3 km base circles as a separate static layer.
Keep it visibility-driven and style it from the same AQI color map so the layer stays consistent with the rest of the map without overwriting the older 1 km circles.

### 12.6.4 Apply the Elevated Fill

Apply the elevated fillOpacity from 12.1a.3, using each station's current CPCB AQI color.
Keep the fillOpacity in the 0.55-0.65 range so the 3 km circles remain legible without dropping back to the softer older circle styling.

### 12.6.5 Keep Bridges Above Circles

Z-order the bridge polygons above the base circles so the border remains visibly distinct at the overlap rather than disappearing under the circle fill.
Use explicit Leaflet panes or an equivalent stacking rule instead of relying only on JSX order, because the bridge layer must stay readable when both layers are visible together.


### 12.6.6 Add the Toggle Button to the UI

Add the pairwise overlay toggle buttons to the sidebar using the same pill-style control pattern as the Phase 10.4 coverage-mode toggle.
Keep the bridge controls alongside the other map controls so users can reveal the precomputed 3 km circles and bridge polygons without changing the geometry pipeline.
## Result

### 12.6.7 Confirm Additive Placement

Confirm that the new pairwise controls sit alongside Circles and Voronoi rather than replacing either one.
The existing coverage-mode pills should remain intact, with the pairwise overlay controls added as an extra mode group.

This rule now serves as the shared geometry gate for any pairwise bridge-polygon construction that follows.





## 12.7 Reactivity

### 12.7.1 Extend the Memoized Color Map

Extend the Phase 10.6 memoized station_id -> color map so it drives the bridge polygons' two-tone borders as well as the circle layers.
That keeps the bridge styling reactive to the same AQI source of truth, so when a station color changes the bridge outline updates with it.

### 12.7.2 Drive the 3 km Circle Fills

Use the same memoized station_id -> color map to drive the 3 km circles' fill colors as well.
That way the bridge borders and the 3 km fills stay aligned with the current CPCB AQI state instead of drifting to a separate styling source.


### 12.7.3 Confirm Live-Mode Color Updates

When switching back to Live mode, the same memoized station_id -> color map should keep updating from the live coverage summaries, matching the existing Voronoi behavior from Phase 11.1.
That ensures the bridge borders and 3 km fills keep tracking fresh AQI values instead of freezing on the last Historical palette.


### 12.7.4 Confirm Historical-Mode Color Updates

When switching to Historical mode and changing the selected date range, the same memoized station_id -> color map should update from the date-range-driven coverage summaries, matching the existing Voronoi behavior from Phase 11.1.
That ensures the bridge borders and 3 km fills track the historical AQI palette for the chosen date window instead of staying pinned to a stale Live snapshot.

