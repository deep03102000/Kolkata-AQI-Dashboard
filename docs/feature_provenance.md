# Feature Provenance

This file maps the current dashboard features back to the work that introduced them.

## Phase 1
- Raw station files were inspected and cleaned.
- Station names were normalized and merged into a master table.
- Stations were geocoded and linked to stable IDs.
- Static per-station JSON was exported for the frontend.

## Phase 2
- The React + Vite app was scaffolded.
- Tailwind CSS was added.
- Leaflet and chart dependencies were installed.
- Shared station state was added with `StationContext`.
- Vite chunk splitting was configured.

## Phase 3
- The Kolkata map was built with `react-leaflet`.
- Station markers, AQI circles, and popups were added.
- The AQI legend was added.
- The sidebar was wired to the selected station.

## Phase 4
- Station history fetches now load on demand.
- The chart panel is lazy-loaded.
- The chart uses a single multi-series line chart.
- Date-range filtering is native and client-side.
- Summary stats are computed from the filtered records.

## Phase 5
- WAQI token handling was added.
- WAQI response-shape checks were documented.
- Station-to-WAQI UID mapping was introduced.
- A proxy-based deployment flow was added for live WAQI requests.
- Local caching was added so live data can be reused between refreshes.

## Phase 8
- Build-time geometry tooling was moved into `aqi-dashboard/scripts/`.
- Pairwise distances and midpoint validation were added.
- Raw Voronoi geometry and clipped coverage exports were generated.
- Static public coverage files were published for the frontend.

## Phase 9
- Road network acquisition, conversion, and simplification were added.
- Voronoi boundary crossing checks and road splitting were added.
- Road segments were joined back to stations with midpoint-based assignment.
- Static road exports were published for the frontend.

## Phase 10
- A dedicated `CoverageLayer` component was added.
- `AqiMap` was refactored to lazy-load coverage and road layers.
- The coverage and road overlays started sharing station-color styling.

## Phase 11
- Live fallback summaries now preserve the last known live reading in the map layer.
- Coverage, roads, and popups now receive a shared stale flag.
- Cached live data is visually distinct from fresh live data.
- The sidebar and comparison table surface the same cached-live state.
