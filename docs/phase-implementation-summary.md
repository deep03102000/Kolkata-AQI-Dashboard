# Phase Implementation Summary

This file gives a single, high-level view of how the project evolved from raw AQI files to the current dashboard with optional live WAQI support.

## Phase 1: Data Preparation

Key implementation:

- Inspected the raw station workbooks for headers, dates, units, and missing values.
- Cleaned and standardized the pollutant schema to a common format.
- Added station names, merged the six stations into a master table, and linked them to stable station IDs.
- Geocoded the stations so the frontend could render them on a map.
- Exported per-station static JSON files for on-demand loading in the app.

Outcome:

- The project gained a reliable static data foundation with one JSON file per station.

## Phase 2: React + Vite Setup

Key implementation:

- Scaffolded the React + Vite frontend.
- Added TypeScript and Tailwind CSS.
- Set up chunk splitting so heavy map and chart code could stay out of the initial bundle.
- Introduced shared station state with React context.

Outcome:

- The dashboard could now load as a modern frontend app instead of a data-only repository.

## Phase 3: Interactive Dashboard UI

Key implementation:

- Built the Kolkata map with `react-leaflet`.
- Added station markers, AQI circles, and popups.
- Added the AQI legend and the selected-station sidebar.
- Connected the UI to the shared station context so the map and sidebar stayed in sync.

Outcome:

- Users could visually explore the six stations and inspect the current station context in one place.

## Phase 4: Historical Charts

Key implementation:

- Loaded station history on demand instead of shipping all chart data upfront.
- Lazy-loaded the chart panel to reduce the initial page cost.
- Added a single multi-series chart for pollutant history.
- Added a native date-range picker for historical views.
- Filtered the records client-side and computed summary statistics from the filtered data.

Outcome:

- The app gained a fast historical analysis flow without needing a backend or database.

## Phase 5: WAQI Live Data

Key implementation:

- Added WAQI token handling for local development and deployment.
- Documented and normalized the WAQI response shape.
- Introduced a station-to-WAQI UID mapping so live requests can use stable `feed/@<uid>/` lookups.
- Added a Netlify proxy so production deployments do not expose the secret token in the browser bundle.
- Added live-data hooks with caching and fallback behavior.

Outcome:

- The dashboard can show live AQI when a WAQI token and proxy are configured, while still working from static data alone.

## Phase 8: Station Distance, Midpoints, & Voronoi Coverage

Key implementation:

- Created a build-time geometry area under `aqi-dashboard/scripts/`.
- Kept that tooling separate from `src/` so it stays out of the runtime app bundle.
- Added a station-distance script that reads the Phase 1.11 station master table and computes a pairwise distance matrix.
- Added midpoint validation output for each station pair so the Voronoi coverage can be checked against real neighbor relationships.
- Added raw Voronoi point extraction from the Phase 1.11 station master table so the coverage geometry starts from the canonical six `[longitude, latitude]` points.
- Added an intermediate Voronoi FeatureCollection artifact with one polygon per station, each tagged by `station_id`, so the raw cells stay inspectable before they are copied into the shipped GeoJSON.
- Added a boundary-clipping stage that resolves a Kolkata district polygon from OSM first, falls back to a public geo-data portal when needed, and clips the Voronoi cells before writing the final public coverage file.
- Added a static export step that writes the final clipped, validated Voronoi cells to `aqi-dashboard/public/data/voronoi_cells.json` for direct frontend loading.
- Added a GeoJSON validation step that checks the public export before commit time so the shipped file stays valid and minimal.

Outcome:

- The repository now has a dedicated home for preprocessing scripts that support map coverage and spatial analysis.

## Phase 9: Road Network Acquisition & Spatial Join

Key implementation:

- Added a road-network acquisition script that builds an Overpass QL query for `way["highway"]` features scoped directly to the Kolkata district boundary.
- Wrote the generated query and acquisition metadata to build-time artifacts under `aqi-dashboard/scripts/output/` so the road-network fetch remains reproducible.
- Added a road-network conversion script that turns the raw Overpass way geometry into GeoJSON `LineString` features and writes a dedicated `road_network_linestrings.geojson` artifact.
- Added a road-network simplification script that runs `turf.simplify` over the converted road `LineString` features and writes a lighter `road_network_linestrings_simplified.geojson` artifact.
- Added a Voronoi-boundary loader that reads the clipped Phase 8 coverage cells and exports normalized boundary linework for the road-splitting phase.
- Added a road-boundary crossing checker that intersects each simplified road `LineString` with the Voronoi boundary linework and emits the road subset that needs splitting next.
- Added a road-boundary splitter that uses `turf.lineSplit` for crossing roads, carries non-crossing roads through unchanged as single segments, and emits a small spot-check sample plus validation report for manual inspection.
- Added a static road export step that writes the joined road segments to `aqi-dashboard/public/data/kolkata_roads.json` for direct frontend loading, preserving only `station_id` plus optional `name` and `highway` metadata and validating the GeoJSON structure before publish.
- Added a file-size sanity check for the published road export so `aqi-dashboard/public/data/kolkata_roads.json` stays within the size budget, with a fallback that splits oversized output into `roads_station_<id>.json` files before the asset is treated as final.

Outcome:

- The repository now has dedicated build-time entry points for pulling Kolkata road ways, splitting them at Voronoi boundaries, assigning the resulting segments to stations, and exporting the final joined road layer to static frontend data.

## Phase 10: Rendering - Voronoi Cells & Colored Roads

Key implementation:

- Added a dedicated `CoverageLayer` component that imports the clipped Voronoi public asset and renders it as a Leaflet GeoJSON overlay when coverage is enabled.
- Swapped `AqiMap` to the new coverage layer component so the Voronoi overlay is no longer embedded inline in the map component.
- Added a lazy road-network payload hook so the map can load the road layer only when it is requested.
- Threaded the same station-color and stale-state map through the coverage and road layers so the overlays stay aligned with the live-data view.

Outcome:

- The map now has dedicated rendering surfaces for Voronoi coverage and roads, and the app is structurally ready for the live-state styling work that follows.

## Phase 11: Live Reactivity and Stale Visuals

Key implementation:

- Preserved the last non-null live AQI summary inside `AqiMap` so the map can keep coloring coverage cells when a live fetch temporarily drops out.
- Added a shared `stale` flag to the coverage summary data so popup content, coverage fills, and road strokes can all reflect the same freshness state.
- Marked reused live values with cached-live badges and muted styling instead of presenting them as if they were freshly fetched.
- Kept the sidebar and comparison table aligned with the same live fallback semantics used by the map.

Outcome:

- Live AQI remains visible during transient fetch gaps, but the UI now makes stale fallback data easy to distinguish from a fresh live reading.

## Current State

The project now combines:

- a static, inspectable AQI dataset pipeline
- a React + Vite map dashboard
- lazy historical charts and summary stats
- optional live WAQI support through a proxy-safe deployment flow
- coverage and road overlays built from phase outputs
- explicit stale-data visuals when live values fall back to cached readings
- a build-time `scripts/` area for geometry and coverage tooling

This keeps the app lightweight, maintainable, and easy to run. The current spatial tooling also keeps the station master table and distance analysis in sync.
